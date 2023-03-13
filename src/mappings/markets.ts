/* eslint-disable prefer-const */ // to satisfy AS compiler

// For each division by 10, add one to exponent to truncate one significant figure
import { Address, BigDecimal, BigInt, Bytes, log } from "@graphprotocol/graph-ts";
import { Market, Comptroller, Token } from "../types/schema";
// PriceOracle is valid from Comptroller deployment until block 8498421
import { PriceOracle } from "../types/templates/CToken/PriceOracle";
// PriceOracle2 is valid from 8498422 until present block (until another proxy upgrade)
import { PriceOracle2 } from "../types/templates/CToken/PriceOracle2";
import { ERC20 } from "../types/templates/CToken/ERC20";
import { CToken } from "../types/templates/CToken/CToken";

import { exponentToBigDecimal, mantissaFactor, mantissaFactorBD, cTokenDecimalsBD, zeroBD, zeroBI } from "./helpers";
import { MANTISSA_FACTOR, QIAVAX_TOKEN_ADDRESS, WAVAX_TOKEN_ADDRESS } from "./constants";
import { getOrCreateComptroller } from './comptroller';
import { saveMarketSnapshots } from './snapshots';

let cUSDCAddress = "0x39aa39c021dfbae8fac545936693ac917d5e7563";
let cETHAddress = "0x4ddc2d193948926d02f9b1fe9e1daa0718270ed5";
let daiAddress = "0x89d24a6b4ccb1b6faa2625fe562bdd9a23260359";

// Used for all cERC20 contracts
function getTokenPrice(
  // @ts-ignore
  blockNumber: i32,
  eventAddress: Address,
  underlyingAddress: Address,
  // @ts-ignore
  underlyingDecimals: i32
): BigDecimal {
  let comptroller = getOrCreateComptroller();
  let oracleAddress = comptroller.priceOracle as Address;
  let underlyingPrice: BigDecimal;
  let priceOracle1Address = Address.fromString("02557a5e05defeffd4cae6d83ea3d173b272c904");

  /* PriceOracle2 is used at the block the Comptroller starts using it.
   * see here https://etherscan.io/address/0x3d9819210a31b4961b30ef54be2aed79b9c9cd3b#events
   * Search for event topic 0xd52b2b9b7e9ee655fcb95d2e5b9e0c9f69e7ef2b8e9d2d0ea78402d576d22e22,
   * and see block 7715908.
   *
   * This must use the cToken address.
   *
   * Note this returns the value without factoring in token decimals and wei, so we must divide
   * the number by (ethDecimals - tokenDecimals) and again by the mantissa.
   * USDC would be 10 ^ ((18 - 6) + 18) = 10 ^ 30
   *
   * Note that they deployed 3 different PriceOracles at the beginning of the Comptroller,
   * and that they handle the decimals different, which can break the subgraph. So we actually
   * defer to Oracle 1 before block 7715908, which works,
   * until this one is deployed, which was used for 121 days */
  if (blockNumber > 7715908) {
    let mantissaDecimalFactor = 18 - underlyingDecimals + 18;
    let bdFactor = exponentToBigDecimal(mantissaDecimalFactor);
    let oracle2 = PriceOracle2.bind(oracleAddress);
    let tryPrice = oracle2.try_getUnderlyingPrice(eventAddress);

    underlyingPrice = tryPrice.reverted ? zeroBD : tryPrice.value.toBigDecimal().div(bdFactor);

    /* PriceOracle(1) is used (only for the first ~100 blocks of Comptroller. Annoying but we must
     * handle this. We use it for more than 100 blocks, see reason at top of if statement
     * of PriceOracle2.
     *
     * This must use the token address, not the cToken address.
     *
     * Note this returns the value already factoring in token decimals and wei, therefore
     * we only need to divide by the mantissa, 10^18 */
  } else {
    let oracle1 = PriceOracle.bind(priceOracle1Address);
    underlyingPrice = oracle1
      .getPrice(underlyingAddress)
      .toBigDecimal()
      .div(mantissaFactorBD);
  }
  return underlyingPrice;
}

// Returns the price of USDC in eth. i.e. 0.005 would mean ETH is $200
// @ts-ignore
function getUSDCpriceETH(blockNumber: i32): BigDecimal {
  let comptroller = getOrCreateComptroller();
  let oracleAddress = comptroller.priceOracle as Address;
  let priceOracle1Address = Address.fromString("02557a5e05defeffd4cae6d83ea3d173b272c904");
  let USDCAddress = "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48 ";
  let usdPrice: BigDecimal;

  // See notes on block number if statement in getTokenPrices()
  if (blockNumber > 7715908) {
    let oracle2 = PriceOracle2.bind(oracleAddress);
    let mantissaDecimalFactorUSDC = 18 - 6 + 18;
    let bdFactorUSDC = exponentToBigDecimal(mantissaDecimalFactorUSDC);
    let tryPrice = oracle2.try_getUnderlyingPrice(Address.fromString(cUSDCAddress));

    usdPrice = tryPrice.reverted ? zeroBD : tryPrice.value.toBigDecimal().div(bdFactorUSDC);
  } else {
    let oracle1 = PriceOracle.bind(priceOracle1Address);
    usdPrice = oracle1
      .getPrice(Address.fromString(USDCAddress))
      .toBigDecimal()
      .div(mantissaFactorBD);
  }
  return usdPrice;
}

export function createMarket(marketAddress: string): Market {
  let ctokenAddress = Address.fromString(marketAddress);
  let ctoken = CToken.bind(ctokenAddress);

  let tryDenomination = ctoken.try_underlying();
  let tryName = ctoken.try_name();
  let trySymbol = ctoken.try_symbol();
  let tryReserveFactorMantissa = ctoken.try_reserveFactorMantissa();

  if (ctokenAddress == Address.fromString(QIAVAX_TOKEN_ADDRESS) && !tryReserveFactorMantissa.reverted) {
    let token = getOrCreateToken(WAVAX_TOKEN_ADDRESS);
    token.save();

    let market = getOrCreateMarket(marketAddress, token);
    market.denomination = token.id;
    market.name = "Benqi AVAX";
    market.symbol = "qiAVAX";
    market.reserveFactor = amountToDenomination(tryReserveFactorMantissa.value, MANTISSA_FACTOR);
    market.save();
    return market;
  }

  if (!tryDenomination.reverted && !tryName.reverted && !trySymbol.reverted && !tryReserveFactorMantissa.reverted) {
    let token = getOrCreateToken(tryDenomination.value.toHexString());
    token.save();

    let market = getOrCreateMarket(marketAddress, token);
    market.denomination = token.id;
    market.name = tryName.value;
    market.symbol = trySymbol.value;
    market.reserveFactor = amountToDenomination(tryReserveFactorMantissa.value, MANTISSA_FACTOR);
    market.save();
    return market;
  }
  //edge case @yhayun, no market - returning empty one:
  log.error("*** YHAYUN *** : No market provided", [marketAddress]);
  let tempToken = getOrCreateToken(marketAddress);
  let market = getOrCreateMarket(marketAddress, tempToken);
  return market;
}

export function getOrCreateToken(id: string): Token {
  let token = Token.load(id);
  if (token == null) {
    let tokenContract = ERC20.bind(Address.fromString(id));
    token = new Token(id);
    token.address = Address.fromString(id);
    token.name = tokenContract.try_name().reverted ? null : tokenContract.try_name().value;
    token.symbol = tokenContract.try_symbol().reverted ? null : tokenContract.try_symbol().value;
    token.decimals = tokenContract.try_decimals().reverted ? null : tokenContract.try_decimals().value;
    token.totalSupply = tokenContract.try_totalSupply().reverted ? null : tokenContract.try_totalSupply().value;
  }
  return token as Token;
}

function getOrCreateMarket(id: string, token: Token): Market {
  let market = Market.load(id);
  if (market == null) {
    market = new Market(id);
    market.totalRewardsDistributed = [];
    market.totalFeesGenerated = zeroBD;
    market.totalProtocolFeesGenerated = zeroBD;
    market.totalBorrows = zeroBD;
    market.totalSupply = zeroBD;
    market.supplyRate = zeroBD;
    market.exchangeRate = zeroBD;
    market.reserveFactor = zeroBD;
    market.denomination = token.id;
    market.underlyingAddress = token.address;
    market.underlyingName = token.name!;
    market.underlyingDecimals = token.decimals;
    market.underlyingPrice = zeroBD;
    market.underlyingSymbol = token.symbol!;
    market.underlyingPriceUSD = zeroBD;
    market.borrowRate = zeroBD;
    market.collateralFactor = zeroBD;
    market.cash = zeroBD;
    market.accrualBlockNumber = zeroBI;
    market.blockTimestamp = zeroBI;
    market.borrowIndex = zeroBD;
    market.name = "";
    market.symbol = "";
    market.suppliersCount = 0;
    market.borrowersCount = 0;
  }
  return market as Market;
}

function getMarket(id: string): Market {
  return Market.load(id) as Market;
}

function isMarket(id: string): boolean {
  return getMarket(id) !== null;
}

// @ts-ignore
function amountToDenomination(amount: BigInt, decimals: i32): BigDecimal {
  return amount.toBigDecimal().div(
    BigInt.fromI32(10)
      // @ts-ignore
      .pow(decimals as u8)
      .toBigDecimal()
  );
}

//TODO @yhayun - old create Market function from compound fork - replaced with benqi implementation.
export function createMarketDEPRECATED(marketAddress: string): Market {
  let market: Market;
  let contract = CToken.bind(Address.fromString(marketAddress));

  // It is CETH, which has a slightly different interface
  if (marketAddress == cETHAddress) {
    market = new Market(marketAddress);
    market.underlyingAddress = Address.fromString("0x0000000000000000000000000000000000000000");
    market.underlyingDecimals = 18;
    market.underlyingPrice = BigDecimal.fromString("1");
    market.underlyingName = "Ether";
    market.underlyingSymbol = "ETH";
    market.underlyingPriceUSD = zeroBD;
    // It is all other CERC20 contracts
  } else {
    market = new Market(marketAddress);
    market.underlyingAddress = contract.underlying();
    let underlyingContract = ERC20.bind(market.underlyingAddress as Address);
    market.underlyingDecimals = underlyingContract.decimals();
    if (market.underlyingAddress.toHexString() != daiAddress) {
      market.underlyingName = underlyingContract.name();
      market.underlyingSymbol = underlyingContract.symbol();
    } else {
      market.underlyingName = "Dai Stablecoin v1.0 (DAI)";
      market.underlyingSymbol = "DAI";
    }
    market.underlyingPriceUSD = zeroBD;
    market.underlyingPrice = zeroBD;
    if (marketAddress == cUSDCAddress) {
      market.underlyingPriceUSD = BigDecimal.fromString("1");
    }
  }

  let interestRateModelAddress = contract.try_interestRateModel();
  let reserveFactor = contract.try_reserveFactorMantissa();

  market.borrowRate = zeroBD;
  market.cash = zeroBD;
  market.collateralFactor = zeroBD;
  market.exchangeRate = zeroBD;
  market.interestRateModelAddress = interestRateModelAddress.reverted
    ? Address.fromString("0x0000000000000000000000000000000000000000")
    : interestRateModelAddress.value;
  market.name = contract.name();
  market.reserves = zeroBD;
  market.supplyRate = zeroBD;
  market.symbol = contract.symbol();
  market.totalBorrows = zeroBD;
  market.totalSupply = zeroBD;

  market.accrualBlockNumber = zeroBI;
  market.blockTimestamp = zeroBI;
  market.borrowIndex = zeroBD;
  market.reserveFactor = (reserveFactor.reverted ? BigInt.fromI32(0) : reserveFactor.value).toBigDecimal();

  return market;
}

// Only to be used after block 10678764, since it's aimed to fix the change to USD based price oracle.
// @ts-ignore
function getETHinUSD(blockNumber: i32): BigDecimal {
  let comptroller = getOrCreateComptroller();
  let oracleAddress = comptroller.priceOracle as Address;
  let oracle = PriceOracle2.bind(oracleAddress);
  let tryPrice = oracle.try_getUnderlyingPrice(Address.fromString(cETHAddress));

  let ethPriceInUSD = tryPrice.reverted ? zeroBD : tryPrice.value.toBigDecimal().div(mantissaFactorBD);

  return ethPriceInUSD;
}

// @ts-ignore
export function updateMarket(marketAddress: Address, blockNumber: BigInt, blockTimestamp: BigInt, blockHash: Bytes): Market {
  let marketID = marketAddress.toHexString();
  let market = Market.load(marketID);
  if (market == null) {
    market = createMarket(marketID);
  }

  // Only updateMarket if it has not been updated this block
  if (market.accrualBlockNumber != blockNumber) {
    let contractAddress = Address.fromString(market.id);
    let contract = CToken.bind(contractAddress);

    //TODO - @yhayun - disable underlying price calc:
    // // After block 10678764 price is calculated based on USD instead of ETH
    // if (blockNumber > 10678764) {
    //   let ethPriceInUSD = getETHinUSD(blockNumber);

    //   // if cETH, we only update USD price
    //   if (market.id == cETHAddress) {
    //     market.underlyingPriceUSD = ethPriceInUSD.truncate(market.underlyingDecimals);
    //   } else {
    //     let tokenPriceUSD = getTokenPrice(
    //       blockNumber,
    //       contractAddress,
    //       market.underlyingAddress as Address,
    //       market.underlyingDecimals
    //     );
    //     market.underlyingPrice = tokenPriceUSD.div(ethPriceInUSD).truncate(market.underlyingDecimals);
    //     // if USDC, we only update ETH price
    //     if (market.id != cUSDCAddress) {
    //       market.underlyingPriceUSD = tokenPriceUSD.truncate(market.underlyingDecimals);
    //     }
    //   }
    // } else {
    //   let usdPriceInEth = getUSDCpriceETH(blockNumber);

    //   // if cETH, we only update USD price
    //   if (market.id == cETHAddress) {
    //     market.underlyingPriceUSD = market.underlyingPrice.div(usdPriceInEth).truncate(market.underlyingDecimals);
    //   } else {
    //     let tokenPriceEth = getTokenPrice(
    //       blockNumber,
    //       contractAddress,
    //       market.underlyingAddress as Address,
    //       market.underlyingDecimals
    //     );
    //     market.underlyingPrice = tokenPriceEth.truncate(market.underlyingDecimals);
    //     // if USDC, we only update ETH price
    //     if (market.id != cUSDCAddress) {
    //       market.underlyingPriceUSD = market.underlyingPrice.div(usdPriceInEth).truncate(market.underlyingDecimals);
    //     }
    //   }
    // }

    //TODO @yhayun
    // market.accrualBlockNumber = contract.accrualBlockNumber()
    market.blockTimestamp = blockTimestamp;
    market.totalSupply = contract
      .totalSupply()
      .toBigDecimal()
      .div(cTokenDecimalsBD);

    /* Exchange rate explanation
       In Practice
        - If you call the cDAI contract on etherscan it comes back (2.0 * 10^26)
        - If you call the cUSDC contract on etherscan it comes back (2.0 * 10^14)
        - The real value is ~0.02. So cDAI is off by 10^28, and cUSDC 10^16
       How to calculate for tokens with different decimals
        - Must div by tokenDecimals, 10^market.underlyingDecimals
        - Must multiply by ctokenDecimals, 10^8
        - Must div by mantissa, 10^18
     */
    market.exchangeRate = contract
      .exchangeRateStored()
      .toBigDecimal()
      .div(exponentToBigDecimal(market.underlyingDecimals))
      .times(cTokenDecimalsBD)
      .div(mantissaFactorBD)
      .truncate(mantissaFactor);
    market.borrowIndex = contract
      .borrowIndex()
      .toBigDecimal()
      .div(mantissaFactorBD)
      .truncate(mantissaFactor);

    market.reserves = contract
      .totalReserves()
      .toBigDecimal()
      .div(exponentToBigDecimal(market.underlyingDecimals))
      .truncate(market.underlyingDecimals);
    market.totalBorrows = contract
      .totalBorrows()
      .toBigDecimal()
      .div(exponentToBigDecimal(market.underlyingDecimals))
      .truncate(market.underlyingDecimals);
    market.cash = contract
      .getCash()
      .toBigDecimal()
      .div(exponentToBigDecimal(market.underlyingDecimals))
      .truncate(market.underlyingDecimals);

    // Must convert to BigDecimal, and remove 10^18 that is used for Exp in Compound Solidity
    market.borrowRate = contract
      .borrowRatePerTimestamp()
      .toBigDecimal()
      .times(BigDecimal.fromString("2102400"))
      .div(mantissaFactorBD)
      .truncate(mantissaFactor);

    // This fails on only the first call to cZRX. It is unclear why, but otherwise it works.
    // So we handle it like this.
    //TODO @yhayun
    // let supplyRatePerBlock = contract.su()
    // if (supplyRatePerBlock.reverted) {
    //   log.info('***CALL FAILED*** : cERC20 supplyRatePerBlock() reverted', [])
    //   market.supplyRate = zeroBD
    // } else {
    //   market.supplyRate = supplyRatePerBlock.value
    //     .toBigDecimal()
    //     .times(BigDecimal.fromString('2102400'))
    //     .div(mantissaFactorBD)
    //     .truncate(mantissaFactor)
    // }
    market.save();

    saveMarketSnapshots(market!, blockTimestamp, blockNumber, blockHash);
  }
  return market as Market;
}
