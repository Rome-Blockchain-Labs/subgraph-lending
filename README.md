# Benqi-subgraph

### Prerequisites:
- Graph-cli: https://github.com/graphprotocol/graph-tooling/tree/main/packages/cli

#### To run a graph-node on your local computer
- Graph-node: https://github.com/graphprotocol/graph-node

#### To run a graph-node on docker
- Docker: https://docs.docker.com/engine/
- Setup on host machine: https://github.com/fmedv/docker-go-ipfs#setup-pre-configuration

Sometimes the graph-node process starts up faster than the ipfs, so it's safer to run 2 separate commands:
`docker-compose up -d graph-db ipfs`
`docker-compose up graph-node`

### Commands:

generate types:

- `npx graph codegen --output-dir src/types/`
  build code:
- `npx graph build`
  deploy:
- `npx graph deploy --debug --access-token <TOKEN> yhayun/Benqi --node https://api.thegraph.com/deploy/ --ipfs https://api.thegraph.com/ipfs/`

### Guides

- Deploying subgraphs to Moonriver [https://docs.moonbeam.network/builders/integrations/indexers/thegraph/]
- Reference (Compund V2) [https://github.com/compound-finance/compound-v2-subgraph]
- Partial Benqi graph (Compund V2):
  - [https://github.com/ChaosLabsInc/benqi-subgraph-partial]
  - [https://github.com/token-terminal/tt-subgraphs/tree/main/benqi/v1-avalanche]

## WIP

There are some commented out sections from the original compund-v2 graph, they're all marked with `TODO @yhayun` comment.
Missing items (not exahsutive):

- market.underlyingPriceUSD
- market.accrualBlockNumber
- market.supplyRate
