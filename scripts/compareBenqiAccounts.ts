import axios from "axios";
import BigNumber from 'bignumber.js'
import { promises as fs } from 'fs';
import { compact } from 'lodash';
import { emoji } from 'node-emoji';
import Web3 from "web3";
import { Readable } from 'stream';
import { pipeline, pipe } from 'pipeline-pipe';

type MarketsInfo = Map<string, {
  symbol: string,
  address: string,
  underlyingDecimals: number,
  decimals: number,
  suppliersCount: number,
  borrowersCount: number
}>

type ApiAccountsData = {
  [marketAddress: string]: {
    _suppliers: number,
    _borrowers: number,
    accounts: {
      [accountAddress: string]: {
        supply: BigNumber;
        borrow: BigNumber;
      }
    }
  }
}

type MarketData = {
  address: string;
  marketName: string;
  borrowRate: BigNumber;
  supplyRate: BigNumber;
  cash: BigNumber;
  reserves: BigNumber;
  totalBorrows: BigNumber;
  totalSupply: BigNumber;
  exchangeRate: BigNumber;
  borrowIndex: BigNumber;
}

type BlockMarketsComparison = {
  ok: boolean;
  markets: {
    [market: string]: {
      ok: boolean;
      borrowRate: string;
      supplyRate: string;
      cash: string;
      reserves: string;
      totalBorrows: string;
      totalSupply: string;
      exchangeRate: string;
      borrowIndex: string;
    }
  }
}

type AccountsDiff = {
  [market: string]: {
    market: string;
    marketAddress: string;
    benqiOnlyBorrowers: string[]
    benqiOnlySuppliers: string[]
    graphOnlyBorrowers: string[]
    graphOnlySuppliers: string[]
  }
}

type MarketComparisonResult = {
  borrowRate: string;
  supplyRate: string;
  cash: string;
  reserves: string;
  totalBorrows: string;
  totalSupply: string;
  exchangeRate: string;
  borrowIndex: string;
}

type MarketsReport = {
  [marketName: string]: MarketComparisonResult
}

type AccountsReport = {
  compareCountOrValues: 'count' | 'values';
  markets: {
    [marketName: string]: {
      apiBorrowersCount: number | undefined;
      apiSuppliersCount: number | undefined;
      borrows: string | undefined;
      supplies: string | undefined;
      wrongfulBorrowers: string[] | undefined;
      wrongfulSuppliers: string[] | undefined;
      wrongValueBorrowers: { account: string, apiBalance: string, contractBalance: string, diff: string }[] | undefined;
      wrongValueSuppliers: { account: string, apiBalance: string, contractBalance: string, diff: string }[] | undefined;
      missingBorrowers: string[] | undefined;
      missingSuppliers: string[] | undefined;
      rightfulBorrowers: string[] | undefined;
      rightfulSuppliers: string[] | undefined;
    }
  }
}

// 11002393 last block tested for count
const INITIAL_BLOCK = 3046285; // The first block where everything matches
const BLOCK_NUMBER = 29477025; // Block being tested
const NODE_BATCH_SIZE = 100;

const SUBGRAPH_ID = 'QmaPiB9oke92a8VJPxJPnEMTMdoSZZGzu8n5j3yU8GUwcD'; // Pending version
// const SUBGRAPH_ID = 'QmT3HU78ZkbPtQ1gwrAuYctCT9qxCRGCeBVCTiwHCsJZoo'; // Current version

let web3 = new Web3('https://api.avax.network/ext/bc/C/rpc');

const snapshotCache: Map<string, Map<string, { borrow: BigNumber, supply: BigNumber }>> = new Map();

(async () => {
  // await compareSubgraphAndAPI();
  await compareSubgraphAndContractMarkets();
  await compareSubgraphAndContractAccounts('count');
})();

async function compareSubgraphAndContractMarkets() {
  let anyErrors = await analyseMarkets(BLOCK_NUMBER);

  if (anyErrors) {
    await binaySearchFailingBlock(analyseMarkets);
  }
}

async function compareSubgraphAndContractAccounts(compareCountOrValues: 'count' | 'values' = 'count') {
  let anyErrors = await analyseAccounts(BLOCK_NUMBER, compareCountOrValues);

  if (anyErrors) {
    await binaySearchFailingBlock((block) => analyseAccounts(block, compareCountOrValues));
  }
}

async function binaySearchFailingBlock(analysisFunction: (blockNumber: number) => Promise<boolean>) {
  let initialBlock = INITIAL_BLOCK;
  let finalBlock = BLOCK_NUMBER;
  let blockNumber = Math.ceil((initialBlock + finalBlock) / 2);

  while (blockNumber !== finalBlock) {
    snapshotCache.clear();
    let anyErrors = await analysisFunction(blockNumber);

    console.log(`Finished block ${blockNumber}. Waiting before next block`);

    await new Promise(resolve => setTimeout(resolve, 10 * /*60 **/ 1000)); // Wait 10 minutes

    if (anyErrors)
      finalBlock = blockNumber;

    else
      initialBlock = blockNumber;

    blockNumber = Math.ceil((initialBlock + finalBlock) / 2);

    console.log(`Finished waiting. Now processing block ${blockNumber}.`);
    console.groupEnd();
  }
}

async function analyseMarkets(blockNumber: number): Promise<boolean> {
  let anyErrors = false;

  console.group(blockNumber);
  const graphResponse = await cachedRequest(`./responseGraphMarkets-${blockNumber}.json`, () => getGraphMarkets(blockNumber));

  const marketsInfo = await getMarketsInfo(blockNumber);

  const graphMarkets = parseGraphMarketsResponse(marketsInfo, graphResponse);

  const marketsReport: MarketsReport = { };
  const report = { [blockNumber]: marketsReport };

  const marketAnalysis = await compareMarketValues(web3, graphMarkets, marketsInfo, blockNumber);

  for (const marketName of Object.keys(marketAnalysis.markets)) {
    if (!marketAnalysis.ok)
      anyErrors = false;

    const marketData = marketAnalysis.markets[marketName];

    console.group(marketName);
    console.log('borrowRate: ' + marketData.borrowRate);
    console.log('supplyRate: ' + marketData.supplyRate);
    console.log('cash: ' + marketData.cash);
    console.log('reserves: ' + marketData.reserves);
    console.log('totalBorrows: ' + marketData.totalBorrows);
    console.log('totalSupply: ' + marketData.totalSupply);
    console.log('exchangeRate: ' + marketData.exchangeRate);
    console.log('borrowIndex: ' + marketData.borrowIndex);
    console.groupEnd();

    marketsReport[marketName] = {
      borrowRate: marketData.borrowRate,
      supplyRate: marketData.supplyRate,
      cash: marketData.cash,
      reserves: marketData.reserves,
      totalBorrows: marketData.totalBorrows,
      totalSupply: marketData.totalSupply,
      exchangeRate: marketData.exchangeRate,
      borrowIndex: marketData.borrowIndex,
    };
  }

  fs.writeFile(`./marketAnalysis-${blockNumber}.json`, JSON.stringify(report));

  return anyErrors;
}

async function analyseAccounts(blockNumber: number, compareCountOrValues: 'count' | 'values' = 'count'): Promise<boolean> {
  let anyErrors = false;

  console.group(blockNumber);
  console.log({ compareCountOrValues })
  const graphResponse = await cachedRequest(`./responseGraphAccounts-${blockNumber}.json`, () => getGraphAccounts(blockNumber));

  const marketsInfo = await getMarketsInfo(blockNumber);

  const graphAccounts = parseGraphAccountsResponse(marketsInfo, graphResponse, true);

  const accountsReport: AccountsReport = { compareCountOrValues, markets: {} };
  const report = { [blockNumber]: accountsReport };

  for (const market of Object.keys(graphAccounts)) {
    const marketAddress = mapMarketAddress(market);
    const accountAnalysis = await findWrongfulBalanceAccounts(web3, blockNumber, marketsInfo, market, graphAccounts[market].accounts, 'invalid');

    const apiBorrowersCount = marketsInfo.get(marketAddress)?.borrowersCount;
    const apiSuppliersCount = marketsInfo.get(marketAddress)?.suppliersCount;

    if (compareCountOrValues === 'count') {
      if (accountAnalysis.contractBorrowers.length !== apiBorrowersCount
        || accountAnalysis.contractSuppliers.length !== apiSuppliersCount
        || accountAnalysis.missingBorrowers?.length
        || accountAnalysis.missingSuppliers?.length
        || accountAnalysis.wrongfulBorrowers?.length
        || accountAnalysis.wrongfulSuppliers?.length) {
        anyErrors = true;
      }
    } else {
      if (accountAnalysis.wrongValueBorrowers?.length || accountAnalysis.wrongValueSuppliers?.length) {
        anyErrors = true;
      }
    }

    console.group(market);
    console.group('Borrows');
    console.log(accountAnalysis.BorrowerMessage);
    console.log('Wrong Values:', accountAnalysis.wrongValueBorrowers);
    console.groupEnd();
    console.group('Supplies');
    console.log(accountAnalysis.SupplierMessage);
    console.log('Wrong Values:', accountAnalysis.wrongValueSuppliers);
    console.groupEnd();
    console.groupEnd();

    accountsReport.markets[market] = {
      apiBorrowersCount,
      apiSuppliersCount,
      borrows: accountAnalysis.BorrowerMessage,
      supplies: accountAnalysis.SupplierMessage,
      wrongfulBorrowers: accountAnalysis.wrongfulBorrowers,
      wrongfulSuppliers: accountAnalysis.wrongfulSuppliers,
      wrongValueBorrowers: accountAnalysis.wrongValueBorrowers,
      wrongValueSuppliers: accountAnalysis.wrongValueSuppliers,
      missingBorrowers: accountAnalysis.missingBorrowers,
      missingSuppliers: accountAnalysis.missingSuppliers,
      rightfulBorrowers: accountAnalysis.rightfulBorrowers,
      rightfulSuppliers: accountAnalysis.rightfulSuppliers
    };
  }

  fs.writeFile(`./${compareCountOrValues}/accountAnalysis-${blockNumber}.json`, JSON.stringify(report));
  return anyErrors;
}

async function compareSubgraphAndAPI() {
  const blockNumber = BLOCK_NUMBER;
  const [benqiResponse, graphResponse, marketsInfo] = await Promise.all([
    cachedRequest(`./responseBenqi-${blockNumber}.json`, () => getBenqiAccounts(blockNumber)),
    cachedRequest(`./responseGraphAccounts-${blockNumber}.json`, () => getGraphAccounts(blockNumber)),
    getMarketsInfo(blockNumber)
  ]);

  const graphAccounts = await parseGraphAccountsResponse(marketsInfo, graphResponse);
  const benqiAccounts = parseBenqiResponse(benqiResponse);

  const diff = compareAccounts(graphAccounts, benqiAccounts);

  fs.writeFile('./diffDump.json', JSON.stringify(diff));

  const result = await findWrongfulMissingAccountsFromDiff(diff, blockNumber);
  console.log(result);
}

function compareAccounts(graphData: ApiAccountsData, benqiData: ApiAccountsData): AccountsDiff {
  const diff: AccountsDiff = {};

  for (const market of Object.keys(benqiData)) {
    const benqiAccounts = benqiData[market].accounts;
    const graphAccounts = graphData[market].accounts;

    const { suppliersSet: benqiSuppliersSet, borrowersSet: benqiBorrowersSet } = extractBorrowersAndSuppliersSet(benqiAccounts);
    const { suppliersSet: graphSuppliersSet, borrowersSet: graphBorrowersSet } = extractBorrowersAndSuppliersSet(graphAccounts);

    const benqiOnlyBorrowers = getFirstSetOnlyEntries(benqiBorrowersSet, graphBorrowersSet);
    const benqiOnlySuppliers = getFirstSetOnlyEntries(benqiSuppliersSet, graphSuppliersSet);
    const graphOnlyBorrowers = getFirstSetOnlyEntries(graphBorrowersSet, benqiBorrowersSet);
    const graphOnlySuppliers = getFirstSetOnlyEntries(graphSuppliersSet, benqiSuppliersSet);

    diff[market] = { benqiOnlyBorrowers, benqiOnlySuppliers, graphOnlyBorrowers, graphOnlySuppliers, market, marketAddress: mapMarketAddress(market) };
  }

  return diff;
}

function extractBorrowersAndSuppliersSet<T extends keyof ApiAccountsData>(accountsData: ApiAccountsData[T]['accounts']): { suppliersSet: Set<string>, borrowersSet: Set<string> } {
  const suppliersSet = new Set(compact(Object.entries(accountsData).map(([account, { supply }]) => supply?.gt(0) ? account : undefined)));
  const borrowersSet = new Set(compact(Object.entries(accountsData).map(([account, { borrow }]) => borrow?.gt(0) ? account : undefined)));

  return { suppliersSet, borrowersSet };
}

function getFirstSetOnlyEntries(firstSet: Set<string>, secondSet: Set<string>): string[] {
  return Array.from(firstSet).filter(account => !secondSet.has(account));
}

async function getBenqiAccounts(blockNumber: number) {
  const benqiResponse = await axios.get(`https://api.benqi.fi/users?block=${blockNumber}`);
  return benqiResponse.data;
}

function parseBenqiResponse(accounts: any): ApiAccountsData {
  const benqiAccounts: ApiAccountsData = {};

  for (const account of Object.keys(accounts)) {
    const accountData = accounts[account];
    const account_lc = account.toLowerCase();

    for (const market of Object.keys(accountData.supply)) {
      const cachedMarketData = benqiAccounts[market] = benqiAccounts[market] || { accounts: {} };

      const supplyValue = new BigNumber(accountData.supply[market]);

      if (supplyValue.gt(0)) {
        cachedMarketData._suppliers = (cachedMarketData._suppliers || 0) + 1;
        const cachedAccountMarketData = cachedMarketData.accounts[account_lc] = cachedMarketData.accounts[account_lc] || {};

        cachedAccountMarketData.supply = supplyValue;
      }
    }
    for (const market of Object.keys(accountData.borrows)) {
      const cachedMarketData = benqiAccounts[market] = benqiAccounts[market] || {};

      const borrowValue = new BigNumber(accountData.borrows[market]);

      if (borrowValue.gt(0)) {
        cachedMarketData._borrowers = (cachedMarketData._borrowers || 0) + 1;
        const cachedAccountMarketData = cachedMarketData.accounts[account_lc] = cachedMarketData.accounts[account_lc] || {};

        cachedAccountMarketData.borrow = borrowValue;
      }
    }
  }
  return benqiAccounts;
}

async function getGraphAccounts(blockNumber: number) {
  const timerLabel = 'Fetching API';
  console.time(timerLabel);
  let accounts: any[] = [];
  var config = {
    headers: {
      'Content-Type': 'application/json'
    }
  };

  let lastId: string = '';
  let bringNextPage = true;
  const pageSize = 1000;

  while (bringNextPage) {
    var data = JSON.stringify({
      query: `query X ($lastId: ID!, $first: Int!, $block: Int!)
      {
        accounts (orderBy: id, first: $first, where: { id_gt: $lastId }, block: { number: $block }) {
          id
          tokens {
            totalSupplyAmount: cTokenBalance
            storedBorrowBalance
            accountBorrowIndex
            market {
              borrowIndex
            }
            symbol
          }
        }
      }`,
      variables: { lastId, first: pageSize, block: blockNumber }
    });

    const graphResponse = await axios.post(`https://api.thegraph.com/subgraphs/id/${SUBGRAPH_ID}`, data, config);

    if (graphResponse.status !== 200 || !graphResponse.data.data) {
      console.log(graphResponse.statusText)
      console.log(graphResponse.data)
    }
    if (!graphResponse.data.data?.accounts?.length) {
      bringNextPage = false;
      break;
    }

    accounts = accounts.concat(graphResponse.data.data.accounts);

    lastId = graphResponse.data.data.accounts[graphResponse.data.data.accounts.length - 1].id;
  }

  console.timeEnd(timerLabel)

  return accounts;
}

function parseGraphAccountsResponse(marketsInfo: MarketsInfo, accounts: any, getAllAccounts: boolean = false): ApiAccountsData {
  const graphAccounts: ApiAccountsData = {};
  const timerLabel = `Parsing API Response`;
  console.time(timerLabel)

  for (const accountData of accounts) {
    const account_lc = accountData.id.toLowerCase();

    for (const marketData of accountData.tokens) {
      const market = mapMarketName(marketData.symbol);

      const marketInfo = marketsInfo.get(mapMarketAddress(market))!;

      const cachedMarketData = graphAccounts[market] = graphAccounts[market] || { accounts: {} };

      const supplyValue = new BigNumber(marketData.totalSupplyAmount);

      if (getAllAccounts || supplyValue.gt(0)) {
        cachedMarketData._suppliers = (cachedMarketData._suppliers || 0) + 1;
        const cachedAccountMarketData = cachedMarketData.accounts[account_lc] = cachedMarketData.accounts[account_lc] || {};

        cachedAccountMarketData.supply = supplyValue;
      }

      const accountBorrowIndex = new BigNumber(marketData.accountBorrowIndex);
      const marketBorrowIndex = new BigNumber(marketData.market?.borrowIndex);
      const borrowValue = new BigNumber(marketData.storedBorrowBalance);

      if (getAllAccounts || borrowValue.gt(0)) {
        cachedMarketData._borrowers = (cachedMarketData._borrowers || 0) + 1;
        const cachedAccountMarketData = cachedMarketData.accounts[account_lc] = cachedMarketData.accounts[account_lc] || {};

        cachedAccountMarketData.borrow = borrowValue.isZero() ?
          borrowValue :
          borrowValue.times(marketBorrowIndex.div(accountBorrowIndex)).decimalPlaces(marketInfo.underlyingDecimals, BigNumber.ROUND_FLOOR);
      }
    }
  }
  console.timeEnd(timerLabel)

  return graphAccounts;
}

async function getGraphMarkets(block: number) {
  const timerLabel = 'Fetching API';
  console.time(timerLabel);

  var config = {
    headers: {
      'Content-Type': 'application/json'
    }
  };

  var data = JSON.stringify({
    query: `query X ($block: Int!)
    {
      markets (block: { number: $block }) {
        symbol
        id
        borrowRateAPY
        supplyRateAPY
        cash
        reserves
        totalBorrows
        totalSupply
        exchangeRate
        borrowIndex
        cash
      }
    }`,
    variables: { block }
  });

  const graphResponse = await axios.post(`https://api.thegraph.com/subgraphs/id/${SUBGRAPH_ID}`, data, config);

  console.timeEnd(timerLabel)

  return graphResponse.data.data.markets;
}

function parseGraphMarketsResponse(marketsInfo: MarketsInfo, markets: any): { [market: string]: MarketData } {
  const graphAccounts: ApiAccountsData = {};
  const timerLabel = `Parsing API Response`;
  console.time(timerLabel)

  const marketsData: { [market: string]: MarketData } = {};

  for (const apiMarketData of markets) {
    const market = mapMarketName(apiMarketData.symbol);

    marketsData[market] = {
      address: apiMarketData.id,
      marketName: market,
      borrowRate: new BigNumber(apiMarketData.borrowRateAPY),
      supplyRate: new BigNumber(apiMarketData.supplyRateAPY),
      cash: new BigNumber(apiMarketData.cash),
      reserves: new BigNumber(apiMarketData.reserves),
      totalBorrows: new BigNumber(apiMarketData.totalBorrows),
      totalSupply: new BigNumber(apiMarketData.totalSupply),
      exchangeRate: new BigNumber(apiMarketData.exchangeRate),
      borrowIndex: new BigNumber(apiMarketData.borrowIndex),
    }
  }

  console.timeEnd(timerLabel)

  return marketsData;
}

function mapMarketName(symbol: string): string {
  switch (symbol) {
    case 'qiAVAX':
      return 'AVAX';
    case 'qiBTC.b':
      return 'BTCb';
    case 'qiBUSD':
      return 'BUSD';
    case 'qiDAI':
      return 'DAI.e';
    case 'qiLINK':
      return 'LINK.e';
    case 'qiQI':
      return 'QI';
    case 'qiUSDCn':
      return 'USDC';
    case 'qiUSDC':
      return 'USDC.e';
    case 'qiUSDTn':
      return 'USDT';
    case 'qiUSDT':
      return 'USDT.e';
    case 'qiBTC':
      return 'WBTC.e';
    case 'qiETH':
      return 'WETH.e';
    case 'qisAVAX':
      return 'sAVAX';
    default:
      return 'n/a'
  }
}

function mapMarketAddress(marketName: string): string {
  switch (marketName) {
    case 'AVAX':
      return '0x5c0401e81bc07ca70fad469b451682c0d747ef1c';
    case 'BTCb':
      return '0x89a415b3d20098e6a6c8f7a59001c67bd3129821';
    case 'BUSD':
      return '0x872670ccae8c19557cc9443eff587d7086b8043a';
    case 'DAI.e':
      return '0x835866d37afb8cb8f8334dccdaf66cf01832ff5d';
    case 'LINK.e':
      return '0x4e9f683a27a6bdad3fc2764003759277e93696e6';
    case 'QI':
      return '0x35bd6aeda81a7e5fc7a7832490e71f757b0cd9ce';
    case 'USDC':
      return '0xb715808a78f6041e46d61cb123c9b4a27056ae9c';
    case 'USDC.e':
      return '0xbeb5d47a3f720ec0a390d04b4d41ed7d9688bc7f';
    case 'USDT':
      return '0xd8fcda6ec4bdc547c0827b8804e89acd817d56ef';
    case 'USDT.e':
      return '0xc9e5999b8e75c3feb117f6f73e664b9f3c8ca65c';
    case 'WBTC.e':
      return '0xe194c4c5ac32a3c9ffdb358d9bfd523a0b6d1568';
    case 'WETH.e':
      return '0x334ad834cd4481bb02d09615e7c11a00579a7909';
    case 'sAVAX':
      return '0xf362fea9659cf036792c9cb02f8ff8198e21b4cb';
    default:
      return 'n/a'
  }
}

async function cachedRequest<T>(cacheFileName: string, f: () => Promise<T>): Promise<T> {
  const cacheFileEncoding: BufferEncoding = 'utf-8';
  let cachedResponse: string | undefined;

  try {
    cachedResponse = await fs.readFile(cacheFileName, cacheFileEncoding);
  } catch {
  }

  if (cachedResponse)
    return JSON.parse(cachedResponse);

  const response = await f();

  await fs.writeFile(cacheFileName, JSON.stringify(response), cacheFileEncoding);

  return response;
}

async function findWrongfulMissingAccountsFromDiff(diff: AccountsDiff, blockNumber: number) {
  const result: {
    [marketName: string]: {
      graphMissingBorrowerMessage: string;
      graphMissingSupplierMessage: string;
      benqiMissingBorrowerMessage: string;
      benqiMissingSupplierMessage: string;
      benqiWrongfulMissingBorrowers: string[] | undefined;
      benqiWrongfulMissingSuppliers: string[] | undefined;
      benqiRightfulMissingBorrowers: string[] | undefined;
      benqiRightfulMissingSuppliers: string[] | undefined;
      graphWrongfulMissingBorrowers: string[] | undefined;
      graphWrongfulMissingSuppliers: string[] | undefined;
      graphRightfulMissingBorrowers: string[] | undefined;
      graphRightfulMissingSuppliers: string[] | undefined;
    }
  } = {};

  for (const marketData of Object.values(diff)) {
    const market = marketData.market;

    const {
      missingBorrowerMessage: graphMissingBorrowerMessage,
      missingSupplierMessage: graphMissingSupplierMessage,
      wrongfulMissingBorrowers: graphWrongfulMissingBorrowers,
      wrongfulMissingSuppliers: graphWrongfulMissingSuppliers,
      rightfulMissingBorrowers: graphRightfulMissingBorrowers,
      rightfulMissingSuppliers: graphRightfulMissingSuppliers
    } =
      await findWrongfulMissingAccounts(blockNumber, marketData.marketAddress, marketData.benqiOnlyBorrowers, marketData.benqiOnlySuppliers, 'valid');

    const {
      missingBorrowerMessage: benqiMissingBorrowerMessage,
      missingSupplierMessage: benqiMissingSupplierMessage,
      wrongfulMissingBorrowers: benqiWrongfulMissingBorrowers,
      wrongfulMissingSuppliers: benqiWrongfulMissingSuppliers,
      rightfulMissingBorrowers: benqiRightfulMissingBorrowers,
      rightfulMissingSuppliers: benqiRightfulMissingSuppliers
    } =
      await findWrongfulMissingAccounts(blockNumber, marketData.marketAddress, marketData.graphOnlyBorrowers, marketData.graphOnlySuppliers, 'invalid');

    result[market] = {
      graphMissingBorrowerMessage,
      graphMissingSupplierMessage,
      benqiMissingBorrowerMessage,
      benqiMissingSupplierMessage,
      benqiWrongfulMissingBorrowers,
      benqiWrongfulMissingSuppliers,
      benqiRightfulMissingBorrowers,
      benqiRightfulMissingSuppliers,
      graphWrongfulMissingBorrowers,
      graphWrongfulMissingSuppliers,
      graphRightfulMissingBorrowers,
      graphRightfulMissingSuppliers
    };
  }

  return result;
}

async function findWrongfulMissingAccounts(blockNumber: number, marketAddress: string, oneSideOnlyBorrowers: string[], oneSideOnlySuppliers: string[], saveValidOrInvalid: 'valid' | 'invalid') {
  const wrongfulMissingBorrowers: string[] = [];
  const rightfulMissingBorrowers: string[] = [];
  const wrongfulMissingSuppliers: string[] = [];
  const rightfulMissingSuppliers: string[] = [];

  // If benqi says it's a borrower and the borrow balance is gt 0, it was a missing borrower from the graph
  for (const borrower of oneSideOnlyBorrowers) {
    const { borrow } = await getAccountSnapshot(blockNumber, marketAddress, borrower);

    if (borrow.gt(0)) {
      wrongfulMissingBorrowers.push(borrower);
    } else {
      rightfulMissingBorrowers.push(borrower);
    }
  }

  // If benqi says it's a supplier and the supply balance is gt 0, it was a missing supplier from the graph
  for (const supplier of oneSideOnlySuppliers) {
    const { supply } = await getAccountSnapshot(blockNumber, marketAddress, supplier);

    if (supply.gt(0)) {
      wrongfulMissingSuppliers.push(supplier);
    } else {
      rightfulMissingSuppliers.push(supplier);
    }
  }

  const missingBorrowerMessage = `${wrongfulMissingBorrowers.length}/${oneSideOnlyBorrowers.length}`;
  const missingSupplierMessage = `${wrongfulMissingSuppliers.length}/${oneSideOnlySuppliers.length}`;

  return {
    missingBorrowerMessage,
    missingSupplierMessage,
    wrongfulMissingBorrowers: saveValidOrInvalid === 'valid' ? wrongfulMissingBorrowers : undefined,
    wrongfulMissingSuppliers: saveValidOrInvalid === 'valid' ? wrongfulMissingSuppliers : undefined,
    rightfulMissingBorrowers: saveValidOrInvalid === 'invalid' ? rightfulMissingBorrowers : undefined,
    rightfulMissingSuppliers: saveValidOrInvalid === 'invalid' ? rightfulMissingSuppliers : undefined
  };
}

async function findWrongfulBalanceAccounts<T extends keyof ApiAccountsData>(web3: Web3, blockNumber: number, marketsInfo: MarketsInfo, marketName: string, accounts: ApiAccountsData[T]['accounts'], saveValidOrInvalid: 'valid' | 'invalid' = 'invalid') {
  const wrongValueBorrowers: { account: string, apiBalance: string, contractBalance: string, diff: string }[] = [];
  const wrongValueSuppliers: { account: string, apiBalance: string, contractBalance: string, diff: string }[] = [];
  const wrongfulBorrowers: string[] = [];
  const wrongfulSuppliers: string[] = [];
  const missingBorrowers: string[] = [];
  const missingSuppliers: string[] = [];
  const rightBorrowers: string[] = [];
  const rightSuppliers: string[] = [];

  const timerLabel = `Node calls for ${marketName}`;

  console.time(timerLabel);

  const marketAddress = mapMarketAddress(marketName);
  const marketInfo = marketsInfo.get(marketAddress)!;

  const contractBorrowers: string[] = [];
  const contractSuppliers: string[] = [];

  await pipeline(
    Readable.from(Object.keys(accounts)),
    pipe(accountAddress => ({ accountAddress, accountBalances: accounts[accountAddress] })),
    pipe(async ({ accountAddress, accountBalances }) => {
      const { borrow: contractBorrow, supply: contractSupply } = await getAccountSnapshot(blockNumber, marketAddress, accountAddress);
      return { accountAddress, accountBalances, contractBorrow, contractSupply };
    }, NODE_BATCH_SIZE),
    pipe(({ accountAddress, accountBalances, contractBorrow, contractSupply }) => {
      const contractAdjustedBorrow = contractBorrow.shiftedBy(-marketInfo.underlyingDecimals);
      const contractAdjustedSupply = contractSupply.shiftedBy(-marketInfo.decimals);

      if (compareBigNumbers(contractAdjustedBorrow, accountBalances.borrow)) {
        if (accountBalances.borrow.gt(0)) {
          rightBorrowers.push(accountAddress);
        }
      } else {
        if (isBigNumberEmpty(contractAdjustedBorrow) && !isBigNumberEmpty(accountBalances.borrow)) {
          wrongfulBorrowers.push(accountAddress);
        } else if (!isBigNumberEmpty(contractAdjustedBorrow) && isBigNumberEmpty(accountBalances.borrow)) {
          missingBorrowers.push(accountAddress);
        } else {
          wrongValueBorrowers.push({
            account: accountAddress,
            apiBalance: accountBalances.borrow.toString(),
            contractBalance: contractAdjustedBorrow.toString(),
            diff: accountBalances.borrow.minus(contractAdjustedBorrow).toString()
          });
        }
      }

      if (compareBigNumbers(contractAdjustedSupply, accountBalances.supply)) {
        if (accountBalances.supply.gt(0)) {
          rightSuppliers.push(accountAddress);
        }
      } else {
        if (isBigNumberEmpty(contractAdjustedSupply) && !isBigNumberEmpty(accountBalances.supply)) {
          wrongfulSuppliers.push(accountAddress);
        } else if (!isBigNumberEmpty(contractAdjustedSupply) && isBigNumberEmpty(accountBalances.supply)) {
          missingSuppliers.push(accountAddress);
        } else {
          wrongValueSuppliers.push({
            account: accountAddress,
            apiBalance: accountBalances.supply.toString(),
            contractBalance: contractAdjustedSupply.toString(),
            diff: accountBalances.supply.minus(contractAdjustedSupply).toString()
          });
        }
      }

      if (contractAdjustedBorrow.gt(0)) {
        contractBorrowers.push(accountAddress);
      }
      if (contractAdjustedSupply.gt(0)) {
        contractSuppliers.push(accountAddress);
      }
    })
  )

  const borrowCountComparisonMessage =
    contractBorrowers.length === marketInfo.borrowersCount
      ? `${emoji.white_check_mark} ${contractBorrowers.length}`
      : `${emoji.x} Api: ${marketInfo.borrowersCount}. JIT: ${contractBorrowers.length}`;
  const borrowWrongValueComparisonMessage = `Wrong Value: ${wrongValueBorrowers.length}. Missing: ${missingBorrowers.length}. Wrongful: ${wrongfulBorrowers.length}.`;
  const borrowRightValueComparisonMessage = `${rightBorrowers.length === contractBorrowers.length ? emoji.white_check_mark : emoji.x} Right: ${rightBorrowers.length}/${contractBorrowers.length}.`

  const borrowerMessage = `Count: ${borrowCountComparisonMessage}.\n${borrowRightValueComparisonMessage}\n${borrowWrongValueComparisonMessage}`;

  const supplyCountComparisonMessage =
    contractSuppliers.length === marketInfo.suppliersCount
      ? `${emoji.white_check_mark} ${contractSuppliers.length}`
      : `${emoji.x} Api: ${marketInfo.suppliersCount}. JIT: ${contractSuppliers.length}`;
  const supplyWrongValueComparisonMessage = `Wrong Value: ${wrongValueSuppliers.length}. Missing: ${missingSuppliers.length}. Wrongful: ${wrongfulSuppliers.length}.`;
  const supplyRightValueComparisonMessage = `${rightSuppliers.length === contractSuppliers.length ? emoji.white_check_mark : emoji.x} Right: ${rightSuppliers.length}/${contractSuppliers.length}.`

  const supplierMessage = `Count: ${supplyCountComparisonMessage}.\n${supplyRightValueComparisonMessage}\n${supplyWrongValueComparisonMessage}`;

  console.timeEnd(timerLabel)

  return {
    BorrowerMessage: borrowerMessage,
    SupplierMessage: supplierMessage,
    contractBorrowers,
    contractSuppliers,
    wrongValueBorrowers: saveValidOrInvalid === 'invalid' ? wrongValueBorrowers : undefined,
    wrongValueSuppliers: saveValidOrInvalid === 'invalid' ? wrongValueSuppliers : undefined,
    wrongfulBorrowers: saveValidOrInvalid === 'invalid' ? wrongfulBorrowers : undefined,
    wrongfulSuppliers: saveValidOrInvalid === 'invalid' ? wrongfulSuppliers : undefined,
    missingBorrowers: saveValidOrInvalid === 'invalid' ? missingBorrowers : undefined,
    missingSuppliers: saveValidOrInvalid === 'invalid' ? missingSuppliers : undefined,
    rightfulBorrowers: saveValidOrInvalid === 'valid' ? rightBorrowers : undefined,
    rightfulSuppliers: saveValidOrInvalid === 'valid' ? rightSuppliers : undefined
  };
}

async function compareMarketValues(web3: Web3, marketsData: { [market: string]: MarketData }, marketInfo: MarketsInfo, block: number): Promise<BlockMarketsComparison> {
  const result: BlockMarketsComparison = { ok: true, markets: {} };

  for (const market of Object.keys(marketsData)) {
    const marketData = marketsData[market];

    const contractMarketInfo = await getMarketValuesFromContract(web3, marketInfo, marketData.address, block);

    const borrowRateComparison = getComparison(marketData.borrowRate, contractMarketInfo.borrowRate);
    const supplyRateComparison = getComparison(marketData.supplyRate, contractMarketInfo.supplyRate);
    const cashComparison = getComparison(marketData.cash, contractMarketInfo.cash);
    const reservesComparison = getComparison(marketData.reserves, contractMarketInfo.reserves);
    const totalBorrowsComparison = getComparison(marketData.totalBorrows, contractMarketInfo.totalBorrows);
    const totalSupplyComparison = getComparison(marketData.totalSupply, contractMarketInfo.totalSupply);
    const exchangeRateComparison = getComparison(marketData.exchangeRate, contractMarketInfo.exchangeRate);
    const borrowIndexComparison = getComparison(marketData.borrowIndex, contractMarketInfo.borrowIndex);

    const marketOverrallOk = [
      borrowRateComparison.ok,
      supplyRateComparison.ok,
      cashComparison.ok,
      reservesComparison.ok,
      totalBorrowsComparison.ok,
      totalSupplyComparison.ok,
      exchangeRateComparison.ok,
      borrowIndexComparison.ok,
    ].every(v => v);

    result.ok = result.ok && marketOverrallOk;

    result.markets[market] = {
      ok: marketOverrallOk,
      borrowRate: borrowRateComparison.message,
      supplyRate: supplyRateComparison.message,
      cash: cashComparison.message,
      reserves: reservesComparison.message,
      totalBorrows: totalBorrowsComparison.message,
      totalSupply: totalSupplyComparison.message,
      exchangeRate: exchangeRateComparison.message,
      borrowIndex: borrowIndexComparison.message,
    }
  }

  return result;
}

function getComparison(apiValue: BigNumber, contractValue: BigNumber): { ok: boolean, message: string } {
  const ok = apiValue.eq(contractValue);
  const message = ok ? `${emoji.white_check_mark} ${apiValue.toString()}` : `${emoji.x} Api: ${apiValue.toString()}. Contract: ${contractValue.toString()}`;

  return { ok, message };
}

function compareBigNumbers(number1: BigNumber, number2: BigNumber): boolean {
  return number1.eq(number2) || (isBigNumberEmpty(number1) && isBigNumberEmpty(number2));
}

function isBigNumberEmpty(number: BigNumber): boolean {
  return number.isNaN() || number.isZero();
}

async function getAccountSnapshot(blockNumber: number, marketAddress: string, accountAddress: string): Promise<{ borrow: BigNumber, supply: BigNumber }> {
  const cachedResult = snapshotCache.get(marketAddress)?.get(accountAddress);

  if (cachedResult)
    return cachedResult;

  const contract = new web3.eth.Contract([{
    "type": "function",
    "stateMutability": "view",
    "payable": false,
    "outputs": [
      {
        "type": "uint256",
        "name": "",
        "internalType": "uint256"
      },
      {
        "type": "uint256",
        "name": "",
        "internalType": "uint256"
      },
      {
        "type": "uint256",
        "name": "",
        "internalType": "uint256"
      },
      {
        "type": "uint256",
        "name": "",
        "internalType": "uint256"
      }
    ],
    "name": "getAccountSnapshot",
    "inputs": [
      {
        "type": "address",
        "name": "account",
        "internalType": "address"
      }
    ],
    "constant": true
  }], marketAddress);

  const response = await contract.methods['getAccountSnapshot'](accountAddress).call({}, blockNumber);

  const result = { borrow: new BigNumber(response[2]), supply: new BigNumber(response[1]) };

  const marketCache = snapshotCache.get(marketAddress) || new Map();
  snapshotCache.set(marketAddress, marketCache);

  marketCache.set(accountAddress, result);

  return result;
}

async function getMarketValuesFromContract(web3: Web3, marketsInfo: MarketsInfo, marketAddress: string, block: number): Promise<MarketData> {
  const contract = new web3.eth.Contract([{
    "type": "function",
    "stateMutability": "view",
    "payable": false,
    "outputs": [
      {
        "type": "uint256",
        "name": "",
        "internalType": "uint256"
      }
    ],
    "name": "totalBorrows",
    "inputs": [],
    "constant": true
  },
  {
    "constant": true,
    "inputs": [],
    "name": "totalSupply", 
    "outputs": [
      { 
        "internalType": "uint256", 
        "name": "", 
        "type": "uint256" 
      }
    ], 
    "payable": false, 
    "stateMutability": "view", 
    "type": "function"
  },
  { "constant":true,"inputs":[],"name":"exchangeRateStored","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"payable":false,"stateMutability":"view","type":"function"},
  {"constant":true,"inputs":[],"name":"borrowIndex","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"payable":false,"stateMutability":"view","type":"function"},
  {
    "type": "function",
    "stateMutability": "view",
    "payable": false,
    "outputs": [
      {
        "type": "uint256",
        "name": "",
        "internalType": "uint256"
      }
    ],
    "name": "totalReserves",
    "inputs": [],
    "constant": true
  },
  {
    "type": "function",
    "stateMutability": "view",
    "payable": false,
    "outputs": [
      {
        "type": "uint256",
        "name": "",
        "internalType": "uint256"
      }
    ],
    "name": "getCash",
    "inputs": [],
    "constant": true
  },
  {
    "type": "function",
    "stateMutability": "view",
    "payable": false,
    "outputs": [
      {
        "type": "uint256",
        "name": "",
        "internalType": "uint256"
      }
    ],
    "name": "borrowRatePerTimestamp",
    "inputs": [],
    "constant": true
  },
  {
    "type": "function",
    "stateMutability": "view",
    "payable": false,
    "outputs": [
      {
        "type": "uint256",
        "name": "",
        "internalType": "uint256"
      }
    ],
    "name": "supplyRatePerTimestamp",
    "inputs": [],
    "constant": true
  },
  {
    "type": "function",
    "stateMutability": "view",
    "payable": false,
    "outputs": [
      {
        "type": "uint8",
        "name": "",
        "internalType": "uint8"
      }
    ],
    "name": "decimals",
    "inputs": [],
    "constant": true
  }], marketAddress);

  const totalBorrowsResponse = await contract.methods['totalBorrows']().call({}, block);
  const totalSupplyResponse = await contract.methods['totalSupply']().call({}, block);
  const totalReservesResponse = await contract.methods['totalReserves']().call({}, block);
  const cashResponse = await contract.methods['getCash']().call({}, block);
  const exchangeRateResponse = await contract.methods['exchangeRateStored']().call({}, block);
  const borrowIndexResponse = await contract.methods['borrowIndex']().call({}, block);
  const borrowRateResponse = await contract.methods['borrowRatePerTimestamp']().call({}, block);
  const supplyRateResponse = await contract.methods['supplyRatePerTimestamp']().call({}, block);

  const decimals = marketsInfo.get(marketAddress)!;

  const result: MarketData = {
    marketName: mapMarketName(decimals.symbol),
    totalBorrows: new BigNumber(totalBorrowsResponse).shiftedBy(-decimals.underlyingDecimals),
    totalSupply: new BigNumber(totalSupplyResponse).shiftedBy(-8),
    reserves: new BigNumber(totalReservesResponse).shiftedBy(-decimals.underlyingDecimals),
    cash: new BigNumber(cashResponse).shiftedBy(-decimals?.underlyingDecimals),
    exchangeRate: new BigNumber(exchangeRateResponse).shiftedBy(-(10 + decimals.underlyingDecimals)).decimalPlaces(18, BigNumber.ROUND_DOWN),
    borrowIndex: new BigNumber(borrowIndexResponse).shiftedBy(-18),
    borrowRate: getAPY(new BigNumber(borrowRateResponse).shiftedBy(-18)).decimalPlaces(18, BigNumber.ROUND_DOWN),
    supplyRate: getAPY(new BigNumber(supplyRateResponse).shiftedBy(-18)).decimalPlaces(18, BigNumber.ROUND_DOWN),
    address: marketAddress
  };

  return result;
}

function getAPY(valuePerSecond: BigNumber): BigNumber {
  // (rate * SECONDS_PER_DAY + 1) ** 365 - 1
  return valuePerSecond.times(60 * 60 * 24).plus(1).pow(365).minus(1);
}

async function getMarketsInfo(blockNumber: number): Promise<MarketsInfo> {
  var config = {
    headers: {
      'Content-Type': 'application/json'
    }
  };

  var data = JSON.stringify({
    query: `query X ($block: Int!)
    {
      markets (block: { number: $block }) {
        borrowersCount
        suppliersCount
        symbol
        id
        underlyingDecimals
      }
    }`,
    variables: { block: blockNumber }
  });

  const graphResponse = await axios.post(`https://api.thegraph.com/subgraphs/id/${SUBGRAPH_ID}`, data, config);

  const result: MarketsInfo = new Map();

  for (const marketData of graphResponse.data.data.markets) {
    const marketAddress = mapMarketAddress(mapMarketName(marketData.symbol));

    result.set(marketAddress, {
      symbol: marketData.symbol,
      address: marketData.id,
      underlyingDecimals: Number(marketData.underlyingDecimals),
      decimals: 8,
      suppliersCount: marketData.suppliersCount,
      borrowersCount: marketData.borrowersCount,
    });
  }

  return result;
}