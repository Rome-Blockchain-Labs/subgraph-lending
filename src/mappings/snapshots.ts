/* eslint-disable prefer-const */ // to satisfy AS compiler

import { BigInt, Bytes, log } from '@graphprotocol/graph-ts';
import { AccountCToken, AccountMarketSnapshot, Market, MarketDailySnapshot, MarketHourlySnapshot } from '../types/schema';
import { zeroBD } from './helpers';

// @ts-ignore
let SECONDS_PER_HOUR = BigInt.fromI32(3600 as i32);
// @ts-ignore
let SECONDS_PER_DAY = BigInt.fromI32(24 * 3600 as i32);

export function saveMarketSnapshots(market: Market, timestamp: BigInt, blockNumber: BigInt, blockHash: Bytes): void {
  let hourly: MarketHourlySnapshot | null;
  let daily: MarketDailySnapshot | null;

  let hourlyTimestamp = extractHourlyTimestamp(timestamp);
  let dailyTimestamp = extractDailyTimestamp(timestamp);

  // Since the snapshots share the same interface, they can't have the same id
  // and the if we don't use suffixes the hourly snapshot for the first hour of the day
  // would have the same id as the daily snapshot for the same day
  // So given that we won't be querying based on the ids, we'll rather use the timestamp themselves, it's ok to use suffixes
  let hourlyId = getMarketSnapshotId(market, hourlyTimestamp) + "-1h";
  let dailyId = getMarketSnapshotId(market, dailyTimestamp) + "-1d";

  hourly = MarketHourlySnapshot.load(hourlyId);

  if (!hourly) {
    hourly = new MarketHourlySnapshot(hourlyId);
  }
  
  daily = MarketDailySnapshot.load(dailyId);
  
  if (!daily) {
    daily = new MarketDailySnapshot(dailyId);
  }
  
  fillMarketSnapshotValues(hourly, market, hourlyTimestamp, blockNumber, blockHash);
  fillMarketSnapshotValues(daily, market, dailyTimestamp, blockNumber, blockHash);

  hourly.save();
  daily.save();
}

export function updateAccountMarketSnapshot(accountMarket: AccountCToken, market: Market, blockNumber: BigInt, blockTimestamp: BigInt): AccountMarketSnapshot {
  let id = accountMarket.id.concat('-').concat(blockNumber.toString());

  let snapshot = AccountMarketSnapshot.load(id);
  let previousSupplyAmount = zeroBD;
  let previousBorrowAmount = zeroBD;

  if (!snapshot) {
    snapshot = new AccountMarketSnapshot(id);
    snapshot.accountMarket = accountMarket.id;
  } else {
    previousBorrowAmount = snapshot.borrowBalanceWithInterest;
    previousSupplyAmount = snapshot.totalSupplyAmount;
  }

  snapshot.blockNumber = blockNumber;
  snapshot.timestamp = blockTimestamp;
  snapshot.totalSupplyAmount = accountMarket.cTokenBalance;
  snapshot.accountBorrowIndex = accountMarket.accountBorrowIndex;
  snapshot.exchangeRate = market.exchangeRate;
  snapshot.accrualBlockTimestamp = market.accrualBlockTimestamp;
  snapshot.storedBorrowBalance = accountMarket.storedBorrowBalance;
  snapshot.marketBorrowIndex = market.borrowIndex;

  if (accountMarket.accountBorrowIndex.gt(zeroBD)) {
    snapshot.borrowBalanceWithInterest = accountMarket.storedBorrowBalance.times(market.borrowIndex).div(accountMarket.accountBorrowIndex);
  } else if (accountMarket.storedBorrowBalance.equals(zeroBD)) {
    snapshot.borrowBalanceWithInterest = zeroBD;
  } else {
    log.error('Inconsistent borrow state. BorrowBalance: {}. BorrowIndex: {}', [accountMarket.storedBorrowBalance.toString(), accountMarket.accountBorrowIndex.toString()]);
  }

  snapshot.save();

  let borrowIncrement = 0;
  let supplyIncrement = 0;

  if (previousBorrowAmount.equals(zeroBD) && snapshot.borrowBalanceWithInterest.gt(zeroBD)) {
    // If the borrow amount passed from 0 to something, it's a new borrow
    borrowIncrement = 1;
  } else if (previousBorrowAmount.gt(zeroBD) && snapshot.borrowBalanceWithInterest.equals(zeroBD)) {
    // else if the borrow began 0, the loan was closed
    borrowIncrement = -1;
  }

  if (previousSupplyAmount.equals(zeroBD) && snapshot.totalSupplyAmount.gt(zeroBD)) {
    // If the borrow amount passed from 0 to something, it's a new borrow
    supplyIncrement = 1;
  } else if (previousSupplyAmount.gt(zeroBD) && snapshot.totalSupplyAmount.equals(zeroBD)) {
    // else if the borrow began 0, the loan was closed
    supplyIncrement = -1;
  }

  if (supplyIncrement != 0 || borrowIncrement != 0) {
    let market = Market.load(accountMarket.market);
    
    if (market) {
      market.borrowersCount += borrowIncrement;
      market.suppliersCount += supplyIncrement;
      
      market.save();
    }
  }

  // Explicit cast needed for AssemblyScript
  return snapshot as AccountMarketSnapshot;
}

function fillMarketSnapshotValues<S extends MarketDailySnapshot>(snapshot: S, market: Market, normalizedTimestamp: BigInt, blockNumber: BigInt, blockHash: Bytes): void {

  /*
  This function uses generics with the type constraint because:
    a) AssemblyScript does not support interfaces or union types yet
    b) So the VSCode can hint on the autocomplete with no complaints

  But this type constraint is not yet enforced on AssemblyScript yet, so any types could be sent to this method
  */

  let id = snapshot.id;
  for (let i = 0; i < market.entries.length; i++) {
    let entry = market.entries[i];
    snapshot.set(entry.key, entry.value);
  }
  snapshot.id = id;
  snapshot.lastBlockHash = blockHash;
  snapshot.lastBlockNumber = blockNumber;
  snapshot.timestamp = normalizedTimestamp;
  snapshot.market = market.id;
}

function extractHourlyTimestamp(timestamp: BigInt): BigInt {
  return truncateTimestamp(timestamp, SECONDS_PER_HOUR);
}

function extractDailyTimestamp(timestamp: BigInt): BigInt {
  return truncateTimestamp(timestamp, SECONDS_PER_DAY);
}

function truncateTimestamp(timestamp: BigInt, seconds: BigInt): BigInt {
  return timestamp.div(seconds).times(seconds);
}

function getMarketSnapshotId(market: Market, timestamp: BigInt): string {
  return market.id.concat('-').concat(timestamp.toString());
}