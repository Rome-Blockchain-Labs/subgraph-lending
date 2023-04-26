/* eslint-disable prefer-const */ // to satisfy AS compiler
import {
  Mint,
  Redeem,
  Borrow,
  RepayBorrow,
  LiquidateBorrow,
  Transfer,
  AccrueInterest,
  NewReserveFactor,
  NewMarketInterestRateModel,
} from "../types/templates/CToken/CToken";
import {
  Market,
  Account,
  MintEvent,
  RedeemEvent,
  LiquidationEvent,
  TransferEvent,
  BorrowEvent,
  RepayEvent,
  AccountCToken,
} from "../types/schema";

import { createMarket, updateMarket } from "./markets";
import {
  createAccount,
  updateCommonCTokenStats,
  exponentToBigDecimal,
  cTokenDecimalsBD,
  cTokenDecimals,
  saveAccountCTokenEvent,
  createAccountCToken,
  getAccountCTokenId,
  zeroBD,
} from "./helpers";
import { saveMarketSnapshots, updateAccountMarketSnapshot } from './snapshots';
import { ethereum } from '@graphprotocol/graph-ts';

/* Account supplies assets into market and receives cTokens in exchange
 *
 * event.mintAmount is the underlying asset
 * event.mintTokens is the amount of cTokens minted
 * event.minter is the account
 *
 * Notes
 *    Transfer event will always get emitted with this
 *    Mints originate from the cToken address, not 0x000000, which is typical of ERC-20s
 *    No need to updateMarket(), handleAccrueInterest() ALWAYS runs before this
 *    No need to updateCommonCTokenStats, handleTransfer() will
 *    No need to update cTokenBalance, handleTransfer() will
 */
export function handleMint(event: Mint): void {
  let market = Market.load(event.address.toHexString());
  if (market == null) {
    market = createMarket(event.address.toHexString());
  }
  let mintID = getCTokenEventId(event);

  let cTokenAmount = event.params.mintTokens
    .toBigDecimal()
    .div(cTokenDecimalsBD)
    .truncate(cTokenDecimals);
  let underlyingAmount = event.params.mintAmount
    .toBigDecimal()
    .div(exponentToBigDecimal(market.underlyingDecimals))
    .truncate(market.underlyingDecimals);

  let mint = new MintEvent(mintID);
  mint.type = 'Mint';
  mint.market = market.id;
  mint.blockNumber = event.block.number;
  mint.blockTime = event.block.timestamp;
  mint.tx_hash = event.transaction.hash;
  mint.logIndex = event.transactionLogIndex;
  mint.amount = cTokenAmount;
  mint.user = event.params.minter.toHexString();
  mint.underlyingAmount = underlyingAmount;
  mint.save();

  saveAccountCTokenEvent(market.id, mint.user, mint.id);
}

/*  Account supplies cTokens into market and receives underlying asset in exchange
 *
 *  event.redeemAmount is the underlying asset
 *  event.redeemTokens is the cTokens
 *  event.redeemer is the account
 *
 *  Notes
 *    Transfer event will always get emitted with this
 *    No need to updateMarket(), handleAccrueInterest() ALWAYS runs before this
 *    No need to updateCommonCTokenStats, handleTransfer() will
 *    No need to update cTokenBalance, handleTransfer() will
 */
export function handleRedeem(event: Redeem): void {
  let market = Market.load(event.address.toHexString());
  if (market == null) {
    market = createMarket(event.address.toHexString());
  }
  let redeemID = getCTokenEventId(event);

  let cTokenAmount = event.params.redeemTokens
    .toBigDecimal()
    .div(cTokenDecimalsBD)
    .truncate(cTokenDecimals);
  let underlyingAmount = event.params.redeemAmount
    .toBigDecimal()
    .div(exponentToBigDecimal(market.underlyingDecimals))
    .truncate(market.underlyingDecimals);

  let redeem = new RedeemEvent(redeemID);
  redeem.type = 'Redeem';
  redeem.market = market.id;
  redeem.blockNumber = event.block.number;
  redeem.blockTime = event.block.timestamp;
  redeem.tx_hash = event.transaction.hash;
  redeem.logIndex = event.transactionLogIndex;
  redeem.amount = cTokenAmount;
  redeem.user = event.params.redeemer.toHexString();
  redeem.underlyingAmount = underlyingAmount;
  redeem.save();

  saveAccountCTokenEvent(market.id, redeem.user, redeem.id);
}

/* Borrow assets from the protocol. All values either ETH or ERC20
 *
 * event.params.totalBorrows = of the whole market (not used right now)
 * event.params.accountBorrows = total of the account
 * event.params.borrowAmount = that was added in this event
 * event.params.borrower = the account
 * Notes
 *    No need to updateMarket(), handleAccrueInterest() ALWAYS runs before this
 */
export function handleBorrow(event: Borrow): void {
  let market = Market.load(event.address.toHexString());
  if (market == null) {
    market = createMarket(event.address.toHexString());
  }
  let accountID = event.params.borrower.toHex();
  let account = Account.load(accountID);
  if (account == null) {
    account = createAccount(accountID);
  }
  account.hasBorrowed = true;
  account.save();

  // Update cTokenStats common for all events, and return the stats to update unique
  // values for each event
  let cTokenStats = updateCommonCTokenStats(
    market.id,
    market.symbol,
    accountID,
    event.block.number
  );

  let borrowAmountBD = event.params.borrowAmount.toBigDecimal().div(exponentToBigDecimal(market.underlyingDecimals));
  let previousBorrow = cTokenStats.storedBorrowBalance;

  let accountBorrows = event.params.accountBorrows
    .toBigDecimal()
    .div(exponentToBigDecimal(market.underlyingDecimals))
    .truncate(market.underlyingDecimals);

  cTokenStats.storedBorrowBalance = accountBorrows;
  cTokenStats.accountBorrowIndex = market.borrowIndex;
  cTokenStats.totalUnderlyingBorrowed = cTokenStats.totalUnderlyingBorrowed.plus(borrowAmountBD);
  cTokenStats.save();
  
  if (
    previousBorrow.equals(zeroBD) &&
    !event.params.accountBorrows.toBigDecimal().equals(zeroBD) // checking edge case for borrwing 0
  ) {
    market.borrowersCount = market.borrowersCount + 1
    market.save()
    saveMarketSnapshots(market, event.block.timestamp, event.block.number, event.block.hash);
  }

  let borrowID = getCTokenEventId(event);

  let borrowAmount = borrowAmountBD
    .truncate(market.underlyingDecimals);

  let borrow = new BorrowEvent(borrowID);
  borrow.type = 'Borrow';
  borrow.market = market.id;
  borrow.blockNumber = event.block.number;
  borrow.blockTime = event.block.timestamp;
  borrow.tx_hash = event.transaction.hash;
  borrow.logIndex = event.transactionLogIndex;
  borrow.amount = borrowAmount;
  borrow.accountBorrows = accountBorrows;
  borrow.borrower = event.params.borrower.toHexString();
  borrow.underlyingSymbol = market.underlyingSymbol;
  borrow.save();

  saveAccountCTokenEvent(market.id, borrow.borrower, borrow.id);
  updateAccountMarketSnapshot(cTokenStats, market, event.block.number, event.block.timestamp);
}

export function getCTokenEventId(event: ethereum.Event): string {
  // This id ensures we can sort the events chronologically by using the id
  return event.block.number
    .toString()
    .concat("-")
    .concat(event.transactionLogIndex.toString());
}

/* Repay some amount borrowed. Anyone can repay anyones balance
 *
 * event.params.totalBorrows = of the whole market (not used right now)
 * event.params.accountBorrows = total of the account (not used right now)
 * event.params.repayAmount = that was added in this event
 * event.params.borrower = the borrower
 * event.params.payer = the payer
 *
 * Notes
 *    No need to updateMarket(), handleAccrueInterest() ALWAYS runs before this
 *    Once a account totally repays a borrow, it still has its account interest index set to the
 *    markets value. We keep this, even though you might think it would reset to 0 upon full
 *    repay.
 */
export function handleRepayBorrow(event: RepayBorrow): void {
  let market = Market.load(event.address.toHexString());
  if (market == null) {
    market = createMarket(event.address.toHexString());
  }
  let accountID = event.params.borrower.toHex();
  let account = Account.load(accountID);
  if (account == null) {
    createAccount(accountID);
  }

  // Update cTokenStats common for all events, and return the stats to update unique
  // values for each event
  let cTokenStats = updateCommonCTokenStats(
    market.id,
    market.symbol,
    accountID,
    event.block.number
  );

  let repayAmountBD = event.params.repayAmount.toBigDecimal().div(exponentToBigDecimal(market.underlyingDecimals));

  let previousAccountBorrows = cTokenStats.storedBorrowBalance;

  let accountBorrows = event.params.accountBorrows
    .toBigDecimal()
    .div(exponentToBigDecimal(market.underlyingDecimals))
    .truncate(market.underlyingDecimals);

  cTokenStats.storedBorrowBalance = accountBorrows;
  cTokenStats.accountBorrowIndex = market.borrowIndex;
  cTokenStats.totalUnderlyingRepaid = cTokenStats.totalUnderlyingRepaid.plus(repayAmountBD);
  cTokenStats.save();

  if (previousAccountBorrows.gt(zeroBD) && cTokenStats.storedBorrowBalance.equals(zeroBD)) {
    market.borrowersCount = market.borrowersCount - 1
    market.save()
    saveMarketSnapshots(market, event.block.timestamp, event.block.number, event.block.hash);
  }

  let repayID = getCTokenEventId(event);

  let repayAmount = repayAmountBD.truncate(market.underlyingDecimals);

  let repay = new RepayEvent(repayID);
  repay.type = 'RepayBorrow';
  repay.market = market.id;
  repay.blockNumber = event.block.number;
  repay.blockTime = event.block.timestamp;
  repay.tx_hash = event.transaction.hash;
  repay.logIndex = event.transactionLogIndex;
  repay.amount = repayAmount;
  repay.accountBorrows = accountBorrows;
  repay.borrower = event.params.borrower.toHexString();
  repay.payer = event.params.payer.toHexString();
  repay.underlyingSymbol = market.underlyingSymbol;
  repay.save();

  saveAccountCTokenEvent(market.id, repay.borrower, repay.id);
  updateAccountMarketSnapshot(cTokenStats, market, event.block.number, event.block.timestamp);

  // Ensure account and accountCToken for payer
  if (repay.borrower != repay.payer) {
    let payerAccount = Account.load(repay.payer);
    if (payerAccount == null) {
      createAccount(repay.payer);
    }
      
    let payerCTokenStatsID = getAccountCTokenId(market.id, repay.payer);

    let payerCTokenStats = AccountCToken.load(payerCTokenStatsID);

    if (payerCTokenStats == null) {
      payerCTokenStats = createAccountCToken(
        payerCTokenStatsID,
        market.symbol,
        repay.payer,
        market.id
      );
      payerCTokenStats.save();
    }

    saveAccountCTokenEvent(market.id, repay.payer, repay.id);
  }
}

/*
 * Liquidate an account who has fell below the collateral factor.
 *
 * event.params.borrower - the borrower who is getting liquidated of their cTokens
 * event.params.cTokenCollateral - the market ADDRESS of the ctoken being liquidated
 * event.params.liquidator - the liquidator
 * event.params.repayAmount - the amount of underlying to be repaid
 * event.params.seizeTokens - cTokens seized (transfer event should handle this)
 *
 * Notes
 *    No need to updateMarket(), handleAccrueInterest() ALWAYS runs before this.
 *    When calling this function, event RepayBorrow, and event Transfer will be called every
 *    time. This means we can ignore repayAmount. Seize tokens only changes state
 *    of the cTokens, which is covered by transfer. Therefore we only
 *    add liquidation counts in this handler. We can also ignore the creation of AccountCToken for the liquidator.
 */
export function handleLiquidateBorrow(event: LiquidateBorrow): void {
  let liquidatorID = event.params.liquidator.toHex();
  let liquidator = Account.load(liquidatorID);
  if (liquidator == null) {
    liquidator = createAccount(liquidatorID);
  }
  liquidator.countLiquidator = liquidator.countLiquidator + 1;
  liquidator.save();

  let borrowerID = event.params.borrower.toHex();
  let borrower = Account.load(borrowerID);
  if (borrower == null) {
    borrower = createAccount(borrowerID);
  }
  borrower.countLiquidated = borrower.countLiquidated + 1;
  borrower.save();

  // For a liquidation, the liquidator pays down the borrow of the underlying
  // asset. They seize one of potentially many types of cToken collateral of
  // the underwater borrower. So we must get that address from the event, and
  // the repay token is the event.address
  let marketRepayToken = Market.load(event.address.toHexString());
  if (marketRepayToken == null) {
    marketRepayToken = createMarket(event.address.toHexString());
  }
  let marketCTokenLiquidated = Market.load(event.params.qiTokenCollateral.toHexString());
  if (marketCTokenLiquidated == null) {
    marketCTokenLiquidated = createMarket(event.params.qiTokenCollateral.toHexString());
  }

  let liquidationId = getCTokenEventId(event);

  let cTokenAmount = event.params.seizeTokens
    .toBigDecimal()
    .div(cTokenDecimalsBD)
    .truncate(cTokenDecimals);
  let underlyingRepayAmount = event.params.repayAmount
    .toBigDecimal()
    .div(exponentToBigDecimal(marketRepayToken.underlyingDecimals))
    .truncate(marketRepayToken.underlyingDecimals);

  let liquidation = new LiquidationEvent(liquidationId);
  liquidation.type = 'Liquidation';
  liquidation.blockNumber = event.block.number;
  liquidation.blockTime = event.block.timestamp;
  liquidation.tx_hash = event.transaction.hash;
  liquidation.logIndex = event.transactionLogIndex;
  liquidation.seizedMarket = marketCTokenLiquidated.id;
  liquidation.repayMarket = marketRepayToken.id;
  liquidation.seizedTokens = cTokenAmount;
  liquidation.liquidator = event.params.liquidator.toHexString();
  liquidation.borrower = event.params.borrower.toHexString();
  liquidation.underlyingSymbol = marketRepayToken.underlyingSymbol;
  liquidation.underlyingRepayAmount = underlyingRepayAmount;
  liquidation.save();

  saveAccountCTokenEvent(marketCTokenLiquidated.id, liquidation.borrower, liquidation.id);
  saveAccountCTokenEvent(marketCTokenLiquidated.id, liquidation.liquidator, liquidation.id);
  saveAccountCTokenEvent(marketRepayToken.id, liquidation.borrower, liquidation.id);
  saveAccountCTokenEvent(marketRepayToken.id, liquidation.liquidator, liquidation.id);
}

/* Transferring of cTokens
 *
 * event.params.from = sender of cTokens
 * event.params.to = receiver of cTokens
 * event.params.amount = amount sent
 *
 * Notes
 *    Possible ways to emit Transfer:
 *      seize() - i.e. a Liquidation Transfer (does not emit anything else)
 *      redeemFresh() - i.e. redeeming your cTokens for underlying asset
 *      mintFresh() - i.e. you are lending underlying assets to create ctokens
 *      transfer() - i.e. a basic transfer
 *    This function handles all 4 cases. Transfer is emitted alongside the mint, redeem, and seize
 *    events. So for those events, we do not update cToken balances.
 */
export function handleTransfer(event: Transfer): void {
  // We only updateMarket() if accrual block number is not up to date. This will only happen
  // with normal transfers, since mint, redeem, and seize transfers will already run updateMarket()
  let marketID = event.address.toHexString();
  let market = Market.load(marketID);
  if (market == null) {
    market = createMarket(marketID);
  }

  market = updateMarket(event.address, event.block.number, event.block.timestamp, event.block.hash);

  let amountCToken = event.params.amount.toBigDecimal().div(cTokenDecimalsBD);
  let amountUnderlying = market.exchangeRate.times(amountCToken);
  let amountUnderlyingTruncated = amountUnderlying.truncate(market.underlyingDecimals);

  let transferID = getCTokenEventId(event);

  let accountFromID = event.params.from.toHex();
  let accountToID = event.params.to.toHex();

  let transfer = new TransferEvent(transferID);
  transfer.type = 'Transfer';
  transfer.market = market.id;
  transfer.blockNumber = event.block.number;
  transfer.blockTime = event.block.timestamp;
  transfer.tx_hash = event.transaction.hash;
  transfer.logIndex = event.transactionLogIndex;
  transfer.amount = amountCToken;
  transfer.to = accountToID;
  transfer.from = accountFromID;
  transfer.save();

  let shouldSaveMarketSnapshot = false;

  // Checking if the tx is FROM the cToken contract (i.e. this will not run when minting)
  // If so, it is a mint, and we don't need to run these calculations
  if (accountFromID != marketID) {
    let accountFrom = Account.load(accountFromID);
    if (accountFrom == null) {
      createAccount(accountFromID);
    }

    // Update cTokenStats common for all events, and return the stats to update unique
    // values for each event
    let cTokenStatsFrom = updateCommonCTokenStats(
      market.id,
      market.symbol,
      accountFromID,
      event.block.number
    );

    let previousBalance = cTokenStatsFrom.cTokenBalance;

    cTokenStatsFrom.cTokenBalance = cTokenStatsFrom.cTokenBalance.minus(
      event.params.amount
        .toBigDecimal()
        .div(cTokenDecimalsBD)
        .truncate(cTokenDecimals)
    );

    cTokenStatsFrom.totalUnderlyingRedeemed = cTokenStatsFrom.totalUnderlyingRedeemed.plus(amountUnderlyingTruncated);
    cTokenStatsFrom.save();

    updateAccountMarketSnapshot(cTokenStatsFrom, market, event.block.number, event.block.timestamp);
    // Only associate event with account if it's not the market account
    saveAccountCTokenEvent(market.id, accountFromID, transfer.id);
    
    if (previousBalance.gt(zeroBD) && cTokenStatsFrom.cTokenBalance.equals(zeroBD)) {
      market.suppliersCount = market.suppliersCount - 1
      market.save()
      shouldSaveMarketSnapshot = true;
    }
  }

  // Checking if the tx is TO the cToken contract (i.e. this will not run when redeeming)
  // If so, we ignore it. this leaves an edge case, where someone who accidentally sends
  // cTokens to a cToken contract, where it will not get recorded. Right now it would
  // be messy to include, so we are leaving it out for now TODO fix this in future
  if (accountToID != marketID) {
    let accountTo = Account.load(accountToID);
    if (accountTo == null) {
      createAccount(accountToID);
    }

    // Update cTokenStats common for all events, and return the stats to update unique
    // values for each event
    let cTokenStatsTo = updateCommonCTokenStats(
      market.id,
      market.symbol,
      accountToID,
      event.block.number,
    );

    let previousCTokenBalanceTo = cTokenStatsTo.cTokenBalance
    cTokenStatsTo.cTokenBalance = cTokenStatsTo.cTokenBalance.plus(
      event.params.amount
        .toBigDecimal()
        .div(cTokenDecimalsBD)
        .truncate(cTokenDecimals)
    );

    cTokenStatsTo.totalUnderlyingSupplied = cTokenStatsTo.totalUnderlyingSupplied.plus(amountUnderlyingTruncated);
    cTokenStatsTo.save();
    
    if (
      previousCTokenBalanceTo.equals(zeroBD) &&
      !event.params.amount.toBigDecimal().equals(zeroBD) // checking edge case for transfers of 0
    ) {
      market.suppliersCount = market.suppliersCount + 1
      market.save()
      shouldSaveMarketSnapshot = true;
    }

    updateAccountMarketSnapshot(cTokenStatsTo, market, event.block.number, event.block.timestamp);
    // Only associate event with account if it's not the market account
    saveAccountCTokenEvent(market.id, accountToID, transfer.id);
  }

  if (shouldSaveMarketSnapshot) {
    saveMarketSnapshots(market, event.block.timestamp, event.block.number, event.block.hash);
  }
}

export function handleAccrueInterest(event: AccrueInterest): void {
  updateMarket(event.address, event.block.number, event.block.timestamp, event.block.hash);
}

export function handleNewReserveFactor(event: NewReserveFactor): void {
  let marketID = event.address.toHex();
  let market = Market.load(marketID);
  if (market == null) {
    market = createMarket(marketID);
  }
  market.reserveFactor = event.params.newReserveFactorMantissa.toBigDecimal();
  market.save();
}

export function handleNewMarketInterestRateModel(event: NewMarketInterestRateModel): void {
  let marketID = event.address.toHex();
  let market = Market.load(marketID);
  if (market == null) {
    market = createMarket(marketID);
  }
  market.interestRateModelAddress = event.params.newInterestRateModel;
  market.save();
}
