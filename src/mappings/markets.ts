/* eslint-disable prefer-const */ // to satisfy AS compiler

// For each division by 10, add one to exponent to truncate one significant figure
import { Address, BigDecimal, BigInt, Bytes, log } from "@graphprotocol/graph-ts";
import { Market, Token } from "../types/schema";
// PriceOracle2 is valid from deployment until present block (until another proxy upgrade)
import { PriceOracle2 } from "../types/templates/CToken/PriceOracle2";
import { ERC20 } from "../types/templates/CToken/ERC20";
import { CToken } from "../types/templates/CToken/CToken";

import { exponentToBigDecimal, mantissaFactor, mantissaFactorBD, cTokenDecimalsBD, zeroBD, zeroBI } from "./helpers";
import { MANTISSA_FACTOR, NATIVE_TOKEN_NAME, NATIVE_TOKEN_SYMBOL, NATIVE_TOKEN_UNDERLYING_DECIMALS, NATIVE_TOKEN_UNDERLYING_SYMBOL, QIAVAX_TOKEN_ADDRESS } from "./constants";
import { getOrCreateComptroller } from './comptroller';
import { saveMarketSnapshots } from './snapshots';

let secondsInDay = BigDecimal.fromString('86400');
let oneBD = BigDecimal.fromString('1');

// Used for all cERC20 contracts
function getTokenPrice(
  eventAddress: Address,
  // @ts-ignore
  underlyingDecimals: i32
): BigDecimal {
  let comptroller = getOrCreateComptroller();
  // @ts-ignore
  let oracleAddress = changetype<Address>(comptroller.priceOracle);
  let underlyingPrice: BigDecimal;

  /* 
   * This must use the cToken address.
   *
   * Note this returns the value without factoring in token decimals and wei, so we must divide
   * the number by (ethDecimals - tokenDecimals) and again by the mantissa.
   * USDC would be 10 ^ ((18 - 6) + 18) = 10 ^ 30
   */
  let mantissaDecimalFactor = 18 - underlyingDecimals + 18;
  let bdFactor = exponentToBigDecimal(mantissaDecimalFactor);
  let oracle2 = PriceOracle2.bind(oracleAddress);
  let tryPrice = oracle2.try_getUnderlyingPrice(eventAddress);

  underlyingPrice = tryPrice.reverted ? zeroBD : tryPrice.value.toBigDecimal().div(bdFactor);
  
  return underlyingPrice;
}

export function createMarket(marketAddress: string): Market {
  let ctokenAddress = Address.fromString(marketAddress);
  let ctoken = CToken.bind(ctokenAddress);

  let tryInterestRateModel = ctoken.try_interestRateModel();
  let tryReserveFactorMantissa = ctoken.try_reserveFactorMantissa();

  if (ctokenAddress == Address.fromString(QIAVAX_TOKEN_ADDRESS) && !tryReserveFactorMantissa.reverted) {
    let market = getOrCreateMarket(marketAddress, null);
    market.interestRateModelAddress = tryInterestRateModel.value;
    market.name = NATIVE_TOKEN_NAME;
    market.symbol = NATIVE_TOKEN_SYMBOL;
    market.underlyingSymbol = NATIVE_TOKEN_UNDERLYING_SYMBOL;
    market.underlyingName = NATIVE_TOKEN_UNDERLYING_SYMBOL;
    market.underlyingDecimals = NATIVE_TOKEN_UNDERLYING_DECIMALS;
    market.reserveFactor = amountToDenomination(tryReserveFactorMantissa.value, MANTISSA_FACTOR);
    market.save();
    return market;
  }

  let tryDenomination = ctoken.try_underlying();
  let tryName = ctoken.try_name();
  let trySymbol = ctoken.try_symbol();

  if (!tryDenomination.reverted && !tryName.reverted && !trySymbol.reverted && !tryReserveFactorMantissa.reverted) {
    let token = getOrCreateToken(tryDenomination.value.toHexString());
    token.save();

    let market = getOrCreateMarket(marketAddress, token);
    market.interestRateModelAddress = tryInterestRateModel.value;
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
    if (!tokenContract.try_decimals().reverted) {
      token.decimals =   tokenContract.try_decimals().value;
    }
    token.totalSupply = tokenContract.try_totalSupply().reverted ? null : tokenContract.try_totalSupply().value;
  }
  return token;
}

function getOrCreateMarket(id: string, token: Token | null): Market {
  let market = Market.load(id);
  if (market == null) {
    market = new Market(id);
    market.totalBorrows = zeroBD;
    market.totalSupply = zeroBD;
    market.supplyRatePerTimestamp = zeroBI;
    market.supplyRateAPY = zeroBD;
    market.exchangeRate = zeroBD;
    market.reserveFactor = zeroBD;

    if (token) {
      market.denomination = token.id;
      market.underlyingName = token.name!;
      market.underlyingDecimals = token.decimals;
      market.underlyingSymbol = token.symbol!;
    }

    market.underlyingPrice = zeroBD;
    market.underlyingPriceUSD = zeroBD;
    market.utilizationRate = zeroBD;
    market.borrowRatePerTimestamp = zeroBI;
    market.borrowRateAPY = zeroBD;
    market.collateralFactor = zeroBD;
    market.cash = zeroBD;
    market.accrualBlockTimestamp = zeroBI;
    market.blockTimestamp = zeroBI;
    market.borrowIndex = zeroBD;
    market.name = "";
    market.symbol = "";
    market.suppliersCount = 0;
    market.borrowersCount = 0;
    market.reserves = zeroBD;
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

function getAVAXinUSD(): BigDecimal {
  let comptroller = getOrCreateComptroller();
  // @ts-ignore
  let oracleAddress = changetype<Address>(comptroller.priceOracle);
  let oracle = PriceOracle2.bind(oracleAddress);
  let tryPrice = oracle.try_getUnderlyingPrice(Address.fromString(QIAVAX_TOKEN_ADDRESS));

  let ethPriceInUSD = tryPrice.reverted ? zeroBD : tryPrice.value.toBigDecimal().div(mantissaFactorBD);

  return ethPriceInUSD;
}

export function updateMarket(marketAddress: Address, blockNumber: BigInt, blockTimestamp: BigInt, blockHash: Bytes): Market {
  let marketID = marketAddress.toHexString();
  let market = Market.load(marketID);
  if (market == null) {
    market = createMarket(marketID);
  }

  // Only updateMarket if it has not been updated this block
  if (market.accrualBlockTimestamp !== blockTimestamp) {
    let contractAddress = Address.fromString(market.id);
    let contract = CToken.bind(contractAddress);

    let avaxPriceInUSD = getAVAXinUSD();

    // if cAVAX, we only update USD price
    if (market.id == QIAVAX_TOKEN_ADDRESS) {
      market.underlyingPriceUSD = avaxPriceInUSD.truncate(market.underlyingDecimals);
    } else {
      let tokenPriceUSD = getTokenPrice(
        contractAddress,
        market.underlyingDecimals
      );
      market.underlyingPrice = tokenPriceUSD.div(avaxPriceInUSD).truncate(market.underlyingDecimals);
      market.underlyingPriceUSD = tokenPriceUSD.truncate(market.underlyingDecimals);
    }

    market.accrualBlockTimestamp = contract.accrualBlockTimestamp()
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

    let rawTotalBorrows = contract.totalBorrows();
    market.utilizationRate = !rawTotalBorrows.gt(zeroBI) ?
      zeroBD 
      : rawTotalBorrows
        .toBigDecimal()
        .div(
          contract.getCash()
          .plus(rawTotalBorrows)
          .minus(contract.totalReserves())
          .toBigDecimal()
        ).truncate(18);

    market.borrowRatePerTimestamp = contract.borrowRatePerTimestamp();

    market.borrowRateAPY = getAPY(market.borrowRatePerTimestamp.toBigDecimal());

    let supplyRatePerTimestamp = contract.try_supplyRatePerTimestamp();
    if (supplyRatePerTimestamp.reverted) {
      log.info('***CALL FAILED*** : cERC20 supplyRatePerBlock() reverted', [])
      market.supplyRatePerTimestamp = zeroBI
    } else {
      market.supplyRatePerTimestamp = supplyRatePerTimestamp.value
    }
    
    market.supplyRateAPY = getAPY(market.supplyRatePerTimestamp.toBigDecimal());

    market.save();

    saveMarketSnapshots(market, blockTimestamp, blockNumber, blockHash);
  }
  return market as Market;
}

function getAPY(valuePerSecond: BigDecimal): BigDecimal {
  return pow(
      valuePerSecond
        .div(mantissaFactorBD)
        .times(secondsInDay)
        .plus(oneBD)
      , 365
    )
    .minus(oneBD)
    .truncate(mantissaFactor);
}

function pow(base: BigDecimal, exponent: number): BigDecimal {
  let result = base;

  if (exponent == 0) {
    return BigDecimal.fromString('1');
  }

  for (let i = 2; i <= exponent; i++) {
    result = result.times(base);
  }

  return result;
}
