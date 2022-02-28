/* eslint-disable prefer-const */ // to satisfy AS compiler

import {
  MarketEntered,
  MarketExited,
  NewCloseFactor,
  NewCollateralFactor,
  NewLiquidationIncentive,
  NewPriceOracle,
  MarketListed,
} from "../types/Comptroller/Comptroller";
import { Address } from "@graphprotocol/graph-ts";
import { CToken } from "../types/templates";
import { Market, Comptroller, Account } from "../types/schema";
import { mantissaFactorBD, updateCommonCTokenStats, createAccount } from "./helpers";
import { createMarket } from "./markets";
import { COMPTROLLER_ADDRESS } from "./constants";

export function handleMarketListed(event: MarketListed): void {
  // Dynamically index all new listed tokens
  CToken.create(event.params.cToken);
  // Create the market for this token, since it's now been listed.
  createMarket(event.params.cToken.toHexString());
}

export function handleMarketEntered(event: MarketEntered): void {
  let market = Market.load(event.params.cToken.toHexString());
  // Null check needed to avoid crashing on a new market added. Ideally when dynamic data
  // sources can source from the contract creation block and not the time the
  // comptroller adds the market, we can avoid this altogether
  if (market != null) {
    let accountID = event.params.account.toHex();
    let account = Account.load(accountID);
    if (account == null) {
      createAccount(accountID);
    }

    let cTokenStats = updateCommonCTokenStats(
      market.id,
      market.symbol,
      accountID,
      event.transaction.hash,
      event.block.timestamp,
      event.block.number,
      event.logIndex
    );
    cTokenStats.enteredMarket = true;
    cTokenStats.save();
  }
}

export function handleMarketExited(event: MarketExited): void {
  let market = Market.load(event.params.cToken.toHexString());
  // Null check needed to avoid crashing on a new market added. Ideally when dynamic data
  // sources can source from the contract creation block and not the time the
  // comptroller adds the market, we can avoid this altogether
  if (market != null) {
    let accountID = event.params.account.toHex();
    let account = Account.load(accountID);
    if (account == null) {
      createAccount(accountID);
    }

    let cTokenStats = updateCommonCTokenStats(
      market.id,
      market.symbol,
      accountID,
      event.transaction.hash,
      event.block.timestamp,
      event.block.number,
      event.logIndex
    );
    cTokenStats.enteredMarket = false;
    cTokenStats.save();
  }
}

export function handleNewCloseFactor(event: NewCloseFactor): void {
  let comptroller = getOrCreateComptroller();
  comptroller.closeFactor = event.params.newCloseFactorMantissa;
  comptroller.save();
}

export function handleNewCollateralFactor(event: NewCollateralFactor): void {
  let market = Market.load(event.params.cToken.toHexString());
  // Null check needed to avoid crashing on a new market added. Ideally when dynamic data
  // sources can source from the contract creation block and not the time the
  // comptroller adds the market, we can avoid this altogether
  if (market != null) {
    market.collateralFactor = event.params.newCollateralFactorMantissa.toBigDecimal().div(mantissaFactorBD);
    market.save();
  }
}

// This should be the first event acccording to etherscan but it isn't.... price oracle is. weird
export function handleNewLiquidationIncentive(event: NewLiquidationIncentive): void {
  let comptroller = getOrCreateComptroller();
  comptroller.liquidationIncentive = event.params.newLiquidationIncentiveMantissa;
  comptroller.save();
}

export function handleNewPriceOracle(event: NewPriceOracle): void {
  let comptroller = getOrCreateComptroller();
  // This is the first event used in this mapping, so we use it to create the entity
  if (comptroller == null) {
    comptroller = new Comptroller("1");
  }
  comptroller.priceOracle = event.params.newPriceOracle;
  comptroller.save();
}

export function getOrCreateComptroller(): Comptroller {
  let comptroller = Comptroller.load("1");
  if (comptroller == null) {
    comptroller = new Comptroller("1");
    comptroller.address = Address.fromString(COMPTROLLER_ADDRESS);
  }
  return comptroller as Comptroller;
}
