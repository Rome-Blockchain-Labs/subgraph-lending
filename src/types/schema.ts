// THIS IS AN AUTOGENERATED FILE. DO NOT EDIT THIS FILE DIRECTLY.

import {
  TypedMap,
  Entity,
  Value,
  ValueKind,
  store,
  Address,
  Bytes,
  BigInt,
  BigDecimal
} from "@graphprotocol/graph-ts";

export class Comptroller extends Entity {
  constructor(id: string) {
    super();
    this.set("id", Value.fromString(id));
  }

  save(): void {
    let id = this.get("id");
    assert(id !== null, "Cannot save Comptroller entity without an ID");
    assert(
      id.kind == ValueKind.STRING,
      "Cannot save Comptroller entity with non-string ID. " +
        'Considering using .toHex() to convert the "id" to a string.'
    );
    store.set("Comptroller", id.toString(), this);
  }

  static load(id: string): Comptroller | null {
    return store.get("Comptroller", id) as Comptroller | null;
  }

  get id(): string {
    let value = this.get("id");
    return value.toString();
  }

  set id(value: string) {
    this.set("id", Value.fromString(value));
  }

  get priceOracle(): Bytes | null {
    let value = this.get("priceOracle");
    if (value === null || value.kind == ValueKind.NULL) {
      return null;
    } else {
      return value.toBytes();
    }
  }

  set priceOracle(value: Bytes | null) {
    if (value === null) {
      this.unset("priceOracle");
    } else {
      this.set("priceOracle", Value.fromBytes(value as Bytes));
    }
  }

  get closeFactor(): BigInt | null {
    let value = this.get("closeFactor");
    if (value === null || value.kind == ValueKind.NULL) {
      return null;
    } else {
      return value.toBigInt();
    }
  }

  set closeFactor(value: BigInt | null) {
    if (value === null) {
      this.unset("closeFactor");
    } else {
      this.set("closeFactor", Value.fromBigInt(value as BigInt));
    }
  }

  get liquidationIncentive(): BigInt | null {
    let value = this.get("liquidationIncentive");
    if (value === null || value.kind == ValueKind.NULL) {
      return null;
    } else {
      return value.toBigInt();
    }
  }

  set liquidationIncentive(value: BigInt | null) {
    if (value === null) {
      this.unset("liquidationIncentive");
    } else {
      this.set("liquidationIncentive", Value.fromBigInt(value as BigInt));
    }
  }

  get address(): Bytes {
    let value = this.get("address");
    return value.toBytes();
  }

  set address(value: Bytes) {
    this.set("address", Value.fromBytes(value));
  }
}

export class Market extends Entity {
  constructor(id: string) {
    super();
    this.set("id", Value.fromString(id));
  }

  save(): void {
    let id = this.get("id");
    assert(id !== null, "Cannot save Market entity without an ID");
    assert(
      id.kind == ValueKind.STRING,
      "Cannot save Market entity with non-string ID. " +
        'Considering using .toHex() to convert the "id" to a string.'
    );
    store.set("Market", id.toString(), this);
  }

  static load(id: string): Market | null {
    return store.get("Market", id) as Market | null;
  }

  get borrowRate(): BigDecimal {
    let value = this.get("borrowRate");
    return value.toBigDecimal();
  }

  set borrowRate(value: BigDecimal) {
    this.set("borrowRate", Value.fromBigDecimal(value));
  }

  get cash(): BigDecimal {
    let value = this.get("cash");
    return value.toBigDecimal();
  }

  set cash(value: BigDecimal) {
    this.set("cash", Value.fromBigDecimal(value));
  }

  get collateralFactor(): BigDecimal {
    let value = this.get("collateralFactor");
    return value.toBigDecimal();
  }

  set collateralFactor(value: BigDecimal) {
    this.set("collateralFactor", Value.fromBigDecimal(value));
  }

  get exchangeRate(): BigDecimal {
    let value = this.get("exchangeRate");
    return value.toBigDecimal();
  }

  set exchangeRate(value: BigDecimal) {
    this.set("exchangeRate", Value.fromBigDecimal(value));
  }

  get interestRateModelAddress(): Bytes | null {
    let value = this.get("interestRateModelAddress");
    if (value === null || value.kind == ValueKind.NULL) {
      return null;
    } else {
      return value.toBytes();
    }
  }

  set interestRateModelAddress(value: Bytes | null) {
    if (value === null) {
      this.unset("interestRateModelAddress");
    } else {
      this.set("interestRateModelAddress", Value.fromBytes(value as Bytes));
    }
  }

  get name(): string {
    let value = this.get("name");
    return value.toString();
  }

  set name(value: string) {
    this.set("name", Value.fromString(value));
  }

  get reserves(): BigDecimal | null {
    let value = this.get("reserves");
    if (value === null || value.kind == ValueKind.NULL) {
      return null;
    } else {
      return value.toBigDecimal();
    }
  }

  set reserves(value: BigDecimal | null) {
    if (value === null) {
      this.unset("reserves");
    } else {
      this.set("reserves", Value.fromBigDecimal(value as BigDecimal));
    }
  }

  get supplyRate(): BigDecimal | null {
    let value = this.get("supplyRate");
    if (value === null || value.kind == ValueKind.NULL) {
      return null;
    } else {
      return value.toBigDecimal();
    }
  }

  set supplyRate(value: BigDecimal | null) {
    if (value === null) {
      this.unset("supplyRate");
    } else {
      this.set("supplyRate", Value.fromBigDecimal(value as BigDecimal));
    }
  }

  get symbol(): string {
    let value = this.get("symbol");
    return value.toString();
  }

  set symbol(value: string) {
    this.set("symbol", Value.fromString(value));
  }

  get id(): string {
    let value = this.get("id");
    return value.toString();
  }

  set id(value: string) {
    this.set("id", Value.fromString(value));
  }

  get totalBorrows(): BigDecimal {
    let value = this.get("totalBorrows");
    return value.toBigDecimal();
  }

  set totalBorrows(value: BigDecimal) {
    this.set("totalBorrows", Value.fromBigDecimal(value));
  }

  get totalSupply(): BigDecimal {
    let value = this.get("totalSupply");
    return value.toBigDecimal();
  }

  set totalSupply(value: BigDecimal) {
    this.set("totalSupply", Value.fromBigDecimal(value));
  }

  get underlyingAddress(): Bytes {
    let value = this.get("underlyingAddress");
    return value.toBytes();
  }

  set underlyingAddress(value: Bytes) {
    this.set("underlyingAddress", Value.fromBytes(value));
  }

  get underlyingName(): string {
    let value = this.get("underlyingName");
    return value.toString();
  }

  set underlyingName(value: string) {
    this.set("underlyingName", Value.fromString(value));
  }

  get underlyingPrice(): BigDecimal {
    let value = this.get("underlyingPrice");
    return value.toBigDecimal();
  }

  set underlyingPrice(value: BigDecimal) {
    this.set("underlyingPrice", Value.fromBigDecimal(value));
  }

  get underlyingSymbol(): string {
    let value = this.get("underlyingSymbol");
    return value.toString();
  }

  set underlyingSymbol(value: string) {
    this.set("underlyingSymbol", Value.fromString(value));
  }

  get accrualBlockNumber(): i32 {
    let value = this.get("accrualBlockNumber");
    return value.toI32();
  }

  set accrualBlockNumber(value: i32) {
    this.set("accrualBlockNumber", Value.fromI32(value));
  }

  get blockTimestamp(): i32 {
    let value = this.get("blockTimestamp");
    return value.toI32();
  }

  set blockTimestamp(value: i32) {
    this.set("blockTimestamp", Value.fromI32(value));
  }

  get borrowIndex(): BigDecimal {
    let value = this.get("borrowIndex");
    return value.toBigDecimal();
  }

  set borrowIndex(value: BigDecimal) {
    this.set("borrowIndex", Value.fromBigDecimal(value));
  }

  get reserveFactor(): BigDecimal {
    let value = this.get("reserveFactor");
    return value.toBigDecimal();
  }

  set reserveFactor(value: BigDecimal) {
    this.set("reserveFactor", Value.fromBigDecimal(value));
  }

  get underlyingPriceUSD(): BigDecimal {
    let value = this.get("underlyingPriceUSD");
    return value.toBigDecimal();
  }

  set underlyingPriceUSD(value: BigDecimal) {
    this.set("underlyingPriceUSD", Value.fromBigDecimal(value));
  }

  get underlyingDecimals(): i32 {
    let value = this.get("underlyingDecimals");
    return value.toI32();
  }

  set underlyingDecimals(value: i32) {
    this.set("underlyingDecimals", Value.fromI32(value));
  }

  get totalFeesGenerated(): BigDecimal {
    let value = this.get("totalFeesGenerated");
    return value.toBigDecimal();
  }

  set totalFeesGenerated(value: BigDecimal) {
    this.set("totalFeesGenerated", Value.fromBigDecimal(value));
  }

  get totalProtocolFeesGenerated(): BigDecimal {
    let value = this.get("totalProtocolFeesGenerated");
    return value.toBigDecimal();
  }

  set totalProtocolFeesGenerated(value: BigDecimal) {
    this.set("totalProtocolFeesGenerated", Value.fromBigDecimal(value));
  }

  get denomination(): string | null {
    let value = this.get("denomination");
    if (value === null || value.kind == ValueKind.NULL) {
      return null;
    } else {
      return value.toString();
    }
  }

  set denomination(value: string | null) {
    if (value === null) {
      this.unset("denomination");
    } else {
      this.set("denomination", Value.fromString(value as string));
    }
  }
}

export class Account extends Entity {
  constructor(id: string) {
    super();
    this.set("id", Value.fromString(id));
  }

  save(): void {
    let id = this.get("id");
    assert(id !== null, "Cannot save Account entity without an ID");
    assert(
      id.kind == ValueKind.STRING,
      "Cannot save Account entity with non-string ID. " +
        'Considering using .toHex() to convert the "id" to a string.'
    );
    store.set("Account", id.toString(), this);
  }

  static load(id: string): Account | null {
    return store.get("Account", id) as Account | null;
  }

  get id(): string {
    let value = this.get("id");
    return value.toString();
  }

  set id(value: string) {
    this.set("id", Value.fromString(value));
  }

  get tokens(): Array<string> {
    let value = this.get("tokens");
    return value.toStringArray();
  }

  set tokens(value: Array<string>) {
    this.set("tokens", Value.fromStringArray(value));
  }

  get countLiquidated(): i32 {
    let value = this.get("countLiquidated");
    return value.toI32();
  }

  set countLiquidated(value: i32) {
    this.set("countLiquidated", Value.fromI32(value));
  }

  get countLiquidator(): i32 {
    let value = this.get("countLiquidator");
    return value.toI32();
  }

  set countLiquidator(value: i32) {
    this.set("countLiquidator", Value.fromI32(value));
  }

  get hasBorrowed(): boolean {
    let value = this.get("hasBorrowed");
    return value.toBoolean();
  }

  set hasBorrowed(value: boolean) {
    this.set("hasBorrowed", Value.fromBoolean(value));
  }
}

export class AccountCToken extends Entity {
  constructor(id: string) {
    super();
    this.set("id", Value.fromString(id));
  }

  save(): void {
    let id = this.get("id");
    assert(id !== null, "Cannot save AccountCToken entity without an ID");
    assert(
      id.kind == ValueKind.STRING,
      "Cannot save AccountCToken entity with non-string ID. " +
        'Considering using .toHex() to convert the "id" to a string.'
    );
    store.set("AccountCToken", id.toString(), this);
  }

  static load(id: string): AccountCToken | null {
    return store.get("AccountCToken", id) as AccountCToken | null;
  }

  get id(): string {
    let value = this.get("id");
    return value.toString();
  }

  set id(value: string) {
    this.set("id", Value.fromString(value));
  }

  get market(): string {
    let value = this.get("market");
    return value.toString();
  }

  set market(value: string) {
    this.set("market", Value.fromString(value));
  }

  get symbol(): string {
    let value = this.get("symbol");
    return value.toString();
  }

  set symbol(value: string) {
    this.set("symbol", Value.fromString(value));
  }

  get account(): string {
    let value = this.get("account");
    return value.toString();
  }

  set account(value: string) {
    this.set("account", Value.fromString(value));
  }

  get transactions(): Array<string> {
    let value = this.get("transactions");
    return value.toStringArray();
  }

  set transactions(value: Array<string>) {
    this.set("transactions", Value.fromStringArray(value));
  }

  get accrualBlockNumber(): BigInt {
    let value = this.get("accrualBlockNumber");
    return value.toBigInt();
  }

  set accrualBlockNumber(value: BigInt) {
    this.set("accrualBlockNumber", Value.fromBigInt(value));
  }

  get enteredMarket(): boolean {
    let value = this.get("enteredMarket");
    return value.toBoolean();
  }

  set enteredMarket(value: boolean) {
    this.set("enteredMarket", Value.fromBoolean(value));
  }

  get cTokenBalance(): BigDecimal {
    let value = this.get("cTokenBalance");
    return value.toBigDecimal();
  }

  set cTokenBalance(value: BigDecimal) {
    this.set("cTokenBalance", Value.fromBigDecimal(value));
  }

  get totalUnderlyingSupplied(): BigDecimal {
    let value = this.get("totalUnderlyingSupplied");
    return value.toBigDecimal();
  }

  set totalUnderlyingSupplied(value: BigDecimal) {
    this.set("totalUnderlyingSupplied", Value.fromBigDecimal(value));
  }

  get totalUnderlyingRedeemed(): BigDecimal {
    let value = this.get("totalUnderlyingRedeemed");
    return value.toBigDecimal();
  }

  set totalUnderlyingRedeemed(value: BigDecimal) {
    this.set("totalUnderlyingRedeemed", Value.fromBigDecimal(value));
  }

  get accountBorrowIndex(): BigDecimal {
    let value = this.get("accountBorrowIndex");
    return value.toBigDecimal();
  }

  set accountBorrowIndex(value: BigDecimal) {
    this.set("accountBorrowIndex", Value.fromBigDecimal(value));
  }

  get totalUnderlyingBorrowed(): BigDecimal {
    let value = this.get("totalUnderlyingBorrowed");
    return value.toBigDecimal();
  }

  set totalUnderlyingBorrowed(value: BigDecimal) {
    this.set("totalUnderlyingBorrowed", Value.fromBigDecimal(value));
  }

  get totalUnderlyingRepaid(): BigDecimal {
    let value = this.get("totalUnderlyingRepaid");
    return value.toBigDecimal();
  }

  set totalUnderlyingRepaid(value: BigDecimal) {
    this.set("totalUnderlyingRepaid", Value.fromBigDecimal(value));
  }

  get storedBorrowBalance(): BigDecimal {
    let value = this.get("storedBorrowBalance");
    return value.toBigDecimal();
  }

  set storedBorrowBalance(value: BigDecimal) {
    this.set("storedBorrowBalance", Value.fromBigDecimal(value));
  }
}

export class AccountCTokenTransaction extends Entity {
  constructor(id: string) {
    super();
    this.set("id", Value.fromString(id));
  }

  save(): void {
    let id = this.get("id");
    assert(
      id !== null,
      "Cannot save AccountCTokenTransaction entity without an ID"
    );
    assert(
      id.kind == ValueKind.STRING,
      "Cannot save AccountCTokenTransaction entity with non-string ID. " +
        'Considering using .toHex() to convert the "id" to a string.'
    );
    store.set("AccountCTokenTransaction", id.toString(), this);
  }

  static load(id: string): AccountCTokenTransaction | null {
    return store.get(
      "AccountCTokenTransaction",
      id
    ) as AccountCTokenTransaction | null;
  }

  get id(): string {
    let value = this.get("id");
    return value.toString();
  }

  set id(value: string) {
    this.set("id", Value.fromString(value));
  }

  get account(): string {
    let value = this.get("account");
    return value.toString();
  }

  set account(value: string) {
    this.set("account", Value.fromString(value));
  }

  get tx_hash(): Bytes {
    let value = this.get("tx_hash");
    return value.toBytes();
  }

  set tx_hash(value: Bytes) {
    this.set("tx_hash", Value.fromBytes(value));
  }

  get timestamp(): BigInt {
    let value = this.get("timestamp");
    return value.toBigInt();
  }

  set timestamp(value: BigInt) {
    this.set("timestamp", Value.fromBigInt(value));
  }

  get block(): BigInt {
    let value = this.get("block");
    return value.toBigInt();
  }

  set block(value: BigInt) {
    this.set("block", Value.fromBigInt(value));
  }

  get logIndex(): BigInt {
    let value = this.get("logIndex");
    return value.toBigInt();
  }

  set logIndex(value: BigInt) {
    this.set("logIndex", Value.fromBigInt(value));
  }
}

export class TransferEvent extends Entity {
  constructor(id: string) {
    super();
    this.set("id", Value.fromString(id));
  }

  save(): void {
    let id = this.get("id");
    assert(id !== null, "Cannot save TransferEvent entity without an ID");
    assert(
      id.kind == ValueKind.STRING,
      "Cannot save TransferEvent entity with non-string ID. " +
        'Considering using .toHex() to convert the "id" to a string.'
    );
    store.set("TransferEvent", id.toString(), this);
  }

  static load(id: string): TransferEvent | null {
    return store.get("TransferEvent", id) as TransferEvent | null;
  }

  get id(): string {
    let value = this.get("id");
    return value.toString();
  }

  set id(value: string) {
    this.set("id", Value.fromString(value));
  }

  get amount(): BigDecimal {
    let value = this.get("amount");
    return value.toBigDecimal();
  }

  set amount(value: BigDecimal) {
    this.set("amount", Value.fromBigDecimal(value));
  }

  get to(): Bytes {
    let value = this.get("to");
    return value.toBytes();
  }

  set to(value: Bytes) {
    this.set("to", Value.fromBytes(value));
  }

  get from(): Bytes {
    let value = this.get("from");
    return value.toBytes();
  }

  set from(value: Bytes) {
    this.set("from", Value.fromBytes(value));
  }

  get blockNumber(): i32 {
    let value = this.get("blockNumber");
    return value.toI32();
  }

  set blockNumber(value: i32) {
    this.set("blockNumber", Value.fromI32(value));
  }

  get blockTime(): i32 {
    let value = this.get("blockTime");
    return value.toI32();
  }

  set blockTime(value: i32) {
    this.set("blockTime", Value.fromI32(value));
  }

  get cTokenSymbol(): string {
    let value = this.get("cTokenSymbol");
    return value.toString();
  }

  set cTokenSymbol(value: string) {
    this.set("cTokenSymbol", Value.fromString(value));
  }
}

export class MintEvent extends Entity {
  constructor(id: string) {
    super();
    this.set("id", Value.fromString(id));
  }

  save(): void {
    let id = this.get("id");
    assert(id !== null, "Cannot save MintEvent entity without an ID");
    assert(
      id.kind == ValueKind.STRING,
      "Cannot save MintEvent entity with non-string ID. " +
        'Considering using .toHex() to convert the "id" to a string.'
    );
    store.set("MintEvent", id.toString(), this);
  }

  static load(id: string): MintEvent | null {
    return store.get("MintEvent", id) as MintEvent | null;
  }

  get id(): string {
    let value = this.get("id");
    return value.toString();
  }

  set id(value: string) {
    this.set("id", Value.fromString(value));
  }

  get amount(): BigDecimal {
    let value = this.get("amount");
    return value.toBigDecimal();
  }

  set amount(value: BigDecimal) {
    this.set("amount", Value.fromBigDecimal(value));
  }

  get to(): Bytes {
    let value = this.get("to");
    return value.toBytes();
  }

  set to(value: Bytes) {
    this.set("to", Value.fromBytes(value));
  }

  get from(): Bytes {
    let value = this.get("from");
    return value.toBytes();
  }

  set from(value: Bytes) {
    this.set("from", Value.fromBytes(value));
  }

  get blockNumber(): i32 {
    let value = this.get("blockNumber");
    return value.toI32();
  }

  set blockNumber(value: i32) {
    this.set("blockNumber", Value.fromI32(value));
  }

  get blockTime(): i32 {
    let value = this.get("blockTime");
    return value.toI32();
  }

  set blockTime(value: i32) {
    this.set("blockTime", Value.fromI32(value));
  }

  get cTokenSymbol(): string {
    let value = this.get("cTokenSymbol");
    return value.toString();
  }

  set cTokenSymbol(value: string) {
    this.set("cTokenSymbol", Value.fromString(value));
  }

  get underlyingAmount(): BigDecimal | null {
    let value = this.get("underlyingAmount");
    if (value === null || value.kind == ValueKind.NULL) {
      return null;
    } else {
      return value.toBigDecimal();
    }
  }

  set underlyingAmount(value: BigDecimal | null) {
    if (value === null) {
      this.unset("underlyingAmount");
    } else {
      this.set("underlyingAmount", Value.fromBigDecimal(value as BigDecimal));
    }
  }
}

export class RedeemEvent extends Entity {
  constructor(id: string) {
    super();
    this.set("id", Value.fromString(id));
  }

  save(): void {
    let id = this.get("id");
    assert(id !== null, "Cannot save RedeemEvent entity without an ID");
    assert(
      id.kind == ValueKind.STRING,
      "Cannot save RedeemEvent entity with non-string ID. " +
        'Considering using .toHex() to convert the "id" to a string.'
    );
    store.set("RedeemEvent", id.toString(), this);
  }

  static load(id: string): RedeemEvent | null {
    return store.get("RedeemEvent", id) as RedeemEvent | null;
  }

  get id(): string {
    let value = this.get("id");
    return value.toString();
  }

  set id(value: string) {
    this.set("id", Value.fromString(value));
  }

  get amount(): BigDecimal {
    let value = this.get("amount");
    return value.toBigDecimal();
  }

  set amount(value: BigDecimal) {
    this.set("amount", Value.fromBigDecimal(value));
  }

  get to(): Bytes {
    let value = this.get("to");
    return value.toBytes();
  }

  set to(value: Bytes) {
    this.set("to", Value.fromBytes(value));
  }

  get from(): Bytes {
    let value = this.get("from");
    return value.toBytes();
  }

  set from(value: Bytes) {
    this.set("from", Value.fromBytes(value));
  }

  get blockNumber(): i32 {
    let value = this.get("blockNumber");
    return value.toI32();
  }

  set blockNumber(value: i32) {
    this.set("blockNumber", Value.fromI32(value));
  }

  get blockTime(): i32 {
    let value = this.get("blockTime");
    return value.toI32();
  }

  set blockTime(value: i32) {
    this.set("blockTime", Value.fromI32(value));
  }

  get cTokenSymbol(): string {
    let value = this.get("cTokenSymbol");
    return value.toString();
  }

  set cTokenSymbol(value: string) {
    this.set("cTokenSymbol", Value.fromString(value));
  }

  get underlyingAmount(): BigDecimal | null {
    let value = this.get("underlyingAmount");
    if (value === null || value.kind == ValueKind.NULL) {
      return null;
    } else {
      return value.toBigDecimal();
    }
  }

  set underlyingAmount(value: BigDecimal | null) {
    if (value === null) {
      this.unset("underlyingAmount");
    } else {
      this.set("underlyingAmount", Value.fromBigDecimal(value as BigDecimal));
    }
  }
}

export class LiquidationEvent extends Entity {
  constructor(id: string) {
    super();
    this.set("id", Value.fromString(id));
  }

  save(): void {
    let id = this.get("id");
    assert(id !== null, "Cannot save LiquidationEvent entity without an ID");
    assert(
      id.kind == ValueKind.STRING,
      "Cannot save LiquidationEvent entity with non-string ID. " +
        'Considering using .toHex() to convert the "id" to a string.'
    );
    store.set("LiquidationEvent", id.toString(), this);
  }

  static load(id: string): LiquidationEvent | null {
    return store.get("LiquidationEvent", id) as LiquidationEvent | null;
  }

  get id(): string {
    let value = this.get("id");
    return value.toString();
  }

  set id(value: string) {
    this.set("id", Value.fromString(value));
  }

  get amount(): BigDecimal {
    let value = this.get("amount");
    return value.toBigDecimal();
  }

  set amount(value: BigDecimal) {
    this.set("amount", Value.fromBigDecimal(value));
  }

  get to(): Bytes {
    let value = this.get("to");
    return value.toBytes();
  }

  set to(value: Bytes) {
    this.set("to", Value.fromBytes(value));
  }

  get from(): Bytes {
    let value = this.get("from");
    return value.toBytes();
  }

  set from(value: Bytes) {
    this.set("from", Value.fromBytes(value));
  }

  get blockNumber(): i32 {
    let value = this.get("blockNumber");
    return value.toI32();
  }

  set blockNumber(value: i32) {
    this.set("blockNumber", Value.fromI32(value));
  }

  get blockTime(): i32 {
    let value = this.get("blockTime");
    return value.toI32();
  }

  set blockTime(value: i32) {
    this.set("blockTime", Value.fromI32(value));
  }

  get cTokenSymbol(): string {
    let value = this.get("cTokenSymbol");
    return value.toString();
  }

  set cTokenSymbol(value: string) {
    this.set("cTokenSymbol", Value.fromString(value));
  }

  get underlyingSymbol(): string {
    let value = this.get("underlyingSymbol");
    return value.toString();
  }

  set underlyingSymbol(value: string) {
    this.set("underlyingSymbol", Value.fromString(value));
  }

  get underlyingRepayAmount(): BigDecimal {
    let value = this.get("underlyingRepayAmount");
    return value.toBigDecimal();
  }

  set underlyingRepayAmount(value: BigDecimal) {
    this.set("underlyingRepayAmount", Value.fromBigDecimal(value));
  }
}

export class BorrowEvent extends Entity {
  constructor(id: string) {
    super();
    this.set("id", Value.fromString(id));
  }

  save(): void {
    let id = this.get("id");
    assert(id !== null, "Cannot save BorrowEvent entity without an ID");
    assert(
      id.kind == ValueKind.STRING,
      "Cannot save BorrowEvent entity with non-string ID. " +
        'Considering using .toHex() to convert the "id" to a string.'
    );
    store.set("BorrowEvent", id.toString(), this);
  }

  static load(id: string): BorrowEvent | null {
    return store.get("BorrowEvent", id) as BorrowEvent | null;
  }

  get id(): string {
    let value = this.get("id");
    return value.toString();
  }

  set id(value: string) {
    this.set("id", Value.fromString(value));
  }

  get amount(): BigDecimal {
    let value = this.get("amount");
    return value.toBigDecimal();
  }

  set amount(value: BigDecimal) {
    this.set("amount", Value.fromBigDecimal(value));
  }

  get accountBorrows(): BigDecimal {
    let value = this.get("accountBorrows");
    return value.toBigDecimal();
  }

  set accountBorrows(value: BigDecimal) {
    this.set("accountBorrows", Value.fromBigDecimal(value));
  }

  get borrower(): Bytes {
    let value = this.get("borrower");
    return value.toBytes();
  }

  set borrower(value: Bytes) {
    this.set("borrower", Value.fromBytes(value));
  }

  get blockNumber(): i32 {
    let value = this.get("blockNumber");
    return value.toI32();
  }

  set blockNumber(value: i32) {
    this.set("blockNumber", Value.fromI32(value));
  }

  get blockTime(): i32 {
    let value = this.get("blockTime");
    return value.toI32();
  }

  set blockTime(value: i32) {
    this.set("blockTime", Value.fromI32(value));
  }

  get underlyingSymbol(): string {
    let value = this.get("underlyingSymbol");
    return value.toString();
  }

  set underlyingSymbol(value: string) {
    this.set("underlyingSymbol", Value.fromString(value));
  }
}

export class RepayEvent extends Entity {
  constructor(id: string) {
    super();
    this.set("id", Value.fromString(id));
  }

  save(): void {
    let id = this.get("id");
    assert(id !== null, "Cannot save RepayEvent entity without an ID");
    assert(
      id.kind == ValueKind.STRING,
      "Cannot save RepayEvent entity with non-string ID. " +
        'Considering using .toHex() to convert the "id" to a string.'
    );
    store.set("RepayEvent", id.toString(), this);
  }

  static load(id: string): RepayEvent | null {
    return store.get("RepayEvent", id) as RepayEvent | null;
  }

  get id(): string {
    let value = this.get("id");
    return value.toString();
  }

  set id(value: string) {
    this.set("id", Value.fromString(value));
  }

  get amount(): BigDecimal {
    let value = this.get("amount");
    return value.toBigDecimal();
  }

  set amount(value: BigDecimal) {
    this.set("amount", Value.fromBigDecimal(value));
  }

  get accountBorrows(): BigDecimal {
    let value = this.get("accountBorrows");
    return value.toBigDecimal();
  }

  set accountBorrows(value: BigDecimal) {
    this.set("accountBorrows", Value.fromBigDecimal(value));
  }

  get borrower(): Bytes {
    let value = this.get("borrower");
    return value.toBytes();
  }

  set borrower(value: Bytes) {
    this.set("borrower", Value.fromBytes(value));
  }

  get blockNumber(): i32 {
    let value = this.get("blockNumber");
    return value.toI32();
  }

  set blockNumber(value: i32) {
    this.set("blockNumber", Value.fromI32(value));
  }

  get blockTime(): i32 {
    let value = this.get("blockTime");
    return value.toI32();
  }

  set blockTime(value: i32) {
    this.set("blockTime", Value.fromI32(value));
  }

  get underlyingSymbol(): string {
    let value = this.get("underlyingSymbol");
    return value.toString();
  }

  set underlyingSymbol(value: string) {
    this.set("underlyingSymbol", Value.fromString(value));
  }

  get payer(): Bytes {
    let value = this.get("payer");
    return value.toBytes();
  }

  set payer(value: Bytes) {
    this.set("payer", Value.fromBytes(value));
  }
}

export class Token extends Entity {
  constructor(id: string) {
    super();
    this.set("id", Value.fromString(id));
  }

  save(): void {
    let id = this.get("id");
    assert(id !== null, "Cannot save Token entity without an ID");
    assert(
      id.kind == ValueKind.STRING,
      "Cannot save Token entity with non-string ID. " +
        'Considering using .toHex() to convert the "id" to a string.'
    );
    store.set("Token", id.toString(), this);
  }

  static load(id: string): Token | null {
    return store.get("Token", id) as Token | null;
  }

  get id(): string {
    let value = this.get("id");
    return value.toString();
  }

  set id(value: string) {
    this.set("id", Value.fromString(value));
  }

  get address(): Bytes {
    let value = this.get("address");
    return value.toBytes();
  }

  set address(value: Bytes) {
    this.set("address", Value.fromBytes(value));
  }

  get name(): string {
    let value = this.get("name");
    return value.toString();
  }

  set name(value: string) {
    this.set("name", Value.fromString(value));
  }

  get symbol(): string {
    let value = this.get("symbol");
    return value.toString();
  }

  set symbol(value: string) {
    this.set("symbol", Value.fromString(value));
  }

  get decimals(): i32 {
    let value = this.get("decimals");
    return value.toI32();
  }

  set decimals(value: i32) {
    this.set("decimals", Value.fromI32(value));
  }

  get totalSupply(): BigInt {
    let value = this.get("totalSupply");
    return value.toBigInt();
  }

  set totalSupply(value: BigInt) {
    this.set("totalSupply", Value.fromBigInt(value));
  }
}
