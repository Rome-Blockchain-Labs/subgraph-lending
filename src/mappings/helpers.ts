/* eslint-disable prefer-const */ // to satisfy AS compiler

// For each division by 10, add one to exponent to truncate one significant figure
import { BigDecimal, BigInt } from "@graphprotocol/graph-ts";
import { AccountCToken, Account, AccountCTokenEvent } from "../types/schema";

// @ts-ignore
export function exponentToBigDecimal(decimals: i32): BigDecimal {
  let bd = BigDecimal.fromString("1");
  for (let i = 0; i < decimals; i++) {
    bd = bd.times(BigDecimal.fromString("10"));
  }
  return bd;
}

export let mantissaFactor = 18;
export let cTokenDecimals = 8;
export let mantissaFactorBD: BigDecimal = exponentToBigDecimal(18);
export let cTokenDecimalsBD: BigDecimal = exponentToBigDecimal(8);
export let zeroBD = BigDecimal.fromString("0");
export let zeroBI = BigInt.fromI32(0);

export function createAccountCToken(
  cTokenStatsID: string,
  symbol: string,
  account: string,
  marketID: string
): AccountCToken {
  let cTokenStats = new AccountCToken(cTokenStatsID);
  cTokenStats.symbol = symbol;
  cTokenStats.market = marketID;
  cTokenStats.account = account;
  cTokenStats.accrualBlockNumber = BigInt.fromI32(0);
  cTokenStats.cTokenBalance = zeroBD;
  cTokenStats.totalUnderlyingSupplied = zeroBD;
  cTokenStats.totalUnderlyingRedeemed = zeroBD;
  cTokenStats.accountBorrowIndex = zeroBD;
  cTokenStats.totalUnderlyingBorrowed = zeroBD;
  cTokenStats.totalUnderlyingRepaid = zeroBD;
  cTokenStats.storedBorrowBalance = zeroBD;
  cTokenStats.enteredMarket = false;
  return cTokenStats;
}

export function createAccount(accountID: string): Account {
  let account = new Account(accountID);
  account.countLiquidated = 0;
  account.countLiquidator = 0;
  account.hasBorrowed = false;
  account.save();
  return account;
}

export function updateCommonCTokenStats(
  marketID: string,
  marketSymbol: string,
  accountID: string,
  blockNumber: BigInt
): AccountCToken {
  let cTokenStatsID = getAccountCTokenId(marketID, accountID);
  let cTokenStats = AccountCToken.load(cTokenStatsID);
  if (cTokenStats == null) {
    cTokenStats = createAccountCToken(cTokenStatsID, marketSymbol, accountID, marketID);
  }
  cTokenStats.accrualBlockNumber = blockNumber;
  return cTokenStats as AccountCToken;
}

export function getAccountCTokenId(marketID: string, accountID: string): string {
  return marketID.concat("-").concat(accountID);
}

export function saveAccountCTokenEvent(
  marketId: string,
  accountId: string,
  eventId: string
): AccountCTokenEvent {
  let accountCTokenId = getAccountCTokenId(marketId, accountId);
  
  let id = accountCTokenId
    .concat("-")
    .concat(eventId);
  
  let accountCTokenEvent = AccountCTokenEvent.load(id);

  if (accountCTokenEvent != null) {
    return accountCTokenEvent!;
  }
  
  accountCTokenEvent = new AccountCTokenEvent(id);

  accountCTokenEvent.account = accountId;
  accountCTokenEvent.market = marketId;
  accountCTokenEvent.accountCToken = accountCTokenId;
  accountCTokenEvent.event = eventId;
  accountCTokenEvent.save();

  return accountCTokenEvent!;
}
