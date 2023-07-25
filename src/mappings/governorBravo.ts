import { Address, BigInt, Bytes, ethereum } from "@graphprotocol/graph-ts"
import {
  BreakGlassGuardianChanged as BreakGlassGuardianChangedEvent,
  GovernanceReturnAddressChanged as GovernanceReturnAddressChangedEvent,
  QuorumVotesChanged as QuorumVotesChangedEvent,
  GovernorBravo,
  ProposalCanceled as ProposalCanceledEvent,
  ProposalCreated as ProposalCreatedEvent,
  ProposalExecuted as ProposalExecutedEvent,
  ProposalMaxOperationsChanged as ProposalMaxOperationsChangedEvent,
  ProposalQueued as ProposalQueuedEvent,
  ProposalThresholdChanged as ProposalThresholdChangedEvent,
  StartBlockSet as StartBlockSetEvent,
  VoteCast as VoteCastEvent,
  VotingDelayChanged as VotingDelayChangedEvent
} from "../types/GovernorBravo/GovernorBravo"
import {
  Governor,
  Proposal,
  ProposalStateChange,
  Vote,
} from "../types/schema"
import { GOVERNOR_BRAVO_ADDRESS } from "./constants"

function getVoteValue(voteValue: u32): string {
  switch (voteValue) {
    case 0:
      return "Yes"
    case 1:
      return "No"
    case 2:
      return "Abstain"
    default:
      throw new Error("Invalid vote value: " + voteValue.toString())
  }
}

export function handleProposalCreated(event: ProposalCreatedEvent): void {
  let proposalID = event.params.id.toHex()
  let proposal = new Proposal(proposalID)

  let governor = getOrCreateGovernor()

  proposal.proposer = event.params.proposer
  proposal.actionTargets = event.params.targets.map<Bytes>(t => t as Bytes)
  proposal.actionValues = event.params.values
  proposal.actionSignatures = event.params.signatures
  proposal.actionCalldatas = event.params.calldatas
  proposal.actionTitles = mapActionTitles(proposal.actionTargets, proposal.actionValues, proposal.actionSignatures, proposal.actionCalldatas)
  proposal.startTimestamp = event.params.startTimestamp
  proposal.endTimestamp = event.params.endTimestamp
  proposal.description = event.params.description
  proposal.quorum = event.params.quorum
  proposal.createdAtBlockNumber = event.block.number
  proposal.createdAtBlockTimestamp = event.block.timestamp
  proposal.createdFromTransactionHash = event.transaction.hash
  proposal.updatedAtBlockNumber = event.block.number
  proposal.updatedAtBlockTimestamp = event.block.timestamp
  proposal.updatedFromTransactionHash = event.transaction.hash
  proposal.state = "Active"
  proposal.governor = governor.id

  proposal.save()

  createProposalStateChange(proposalID, proposal.state, event)
}

export function handleProposalCanceled(event: ProposalCanceledEvent): void {
  let proposalID = event.params.id.toHex()
  let proposal = Proposal.load(proposalID)
  if (proposal != null) {
    proposal.state = "Canceled"

    proposal.updatedAtBlockNumber = event.block.number
    proposal.updatedAtBlockTimestamp = event.block.timestamp
    proposal.updatedFromTransactionHash = event.transaction.hash

    proposal.save()

    createProposalStateChange(proposalID, proposal.state, event)
  }
}

export function handleProposalExecuted(event: ProposalExecutedEvent): void {
  let proposalID = event.params.id.toHex()
  let proposal = Proposal.load(proposalID)
  if (proposal != null) {
    proposal.state = "Executed"

    proposal.updatedAtBlockNumber = event.block.number
    proposal.updatedAtBlockTimestamp = event.block.timestamp
    proposal.updatedFromTransactionHash = event.transaction.hash

    proposal.save()

    createProposalStateChange(proposalID, proposal.state, event)
  }
}

export function handleProposalQueued(event: ProposalQueuedEvent): void {
  let proposalID = event.params.id.toHex()
  let proposal = Proposal.load(proposalID)
  if (proposal != null) {
    proposal.state = "Queued"
    proposal.eta = event.params.eta

    proposal.updatedAtBlockNumber = event.block.number
    proposal.updatedAtBlockTimestamp = event.block.timestamp
    proposal.updatedFromTransactionHash = event.transaction.hash

    proposal.save()

    createProposalStateChange(proposalID, proposal.state, event)
  }
}

export function handleStartBlockSet(event: StartBlockSetEvent): void {
  let proposalID = event.params.proposalId.toHex()
  let proposal = Proposal.load(proposalID)
  if (proposal != null) {
    proposal.startBlock = event.block.number
    proposal.state = "Active"

    proposal.updatedAtBlockNumber = event.block.number
    proposal.updatedAtBlockTimestamp = event.block.timestamp
    proposal.updatedFromTransactionHash = event.transaction.hash

    proposal.save()

    createProposalStateChange(proposalID, proposal.state, event)
  }
}

function createProposalStateChange(proposalID: string, newState: string, event: ethereum.Event): void {
  let stateChangeID = proposalID + "-" + newState
  let stateChange = ProposalStateChange.load(stateChangeID)
  if (stateChange == null) {
    stateChange = new ProposalStateChange(stateChangeID)
  }

  stateChange.newState = newState
  stateChange.proposal = proposalID
  stateChange.blockNumber = event.block.number
  stateChange.blockTimestamp = event.block.timestamp
  stateChange.transactionHash = event.transaction.hash

  stateChange.save()
}

export function handleVoteCast(event: VoteCastEvent): void {
  let voteID = event.params.proposalId.toHex() + "-" + event.params.voter.toString()
  let vote = Vote.load(voteID)
  if (vote == null) {
    vote = new Vote(voteID)
  }
  let proposalID = event.params.proposalId.toHex()

  vote.voter = event.params.voter
  vote.proposal = proposalID
  vote.voteValue = getVoteValue(u32(event.params.voteValue))
  vote.votes = event.params.votes
  vote.blockNumber = event.block.number
  vote.blockTimestamp = event.block.timestamp
  vote.transactionHash = event.transaction.hash

  vote.save()
}

export function handleProposalMaxOperationsChanged(
  event: ProposalMaxOperationsChangedEvent
): void {
  const governor = getOrCreateGovernor()

  governor.proposalMaxOperations = event.params.newValue

  governor.updatedAtBlockNumber = event.block.number
  governor.updatedAtBlockTimestamp = event.block.timestamp
  governor.updatedFromTransactionHash = event.transaction.hash

  governor.save()
}

export function handleProposalThresholdChanged(
  event: ProposalThresholdChangedEvent
): void {
  const governor = getOrCreateGovernor()

  governor.proposalThreshold = event.params.newValue

  governor.updatedAtBlockNumber = event.block.number
  governor.updatedAtBlockTimestamp = event.block.timestamp
  governor.updatedFromTransactionHash = event.transaction.hash

  governor.save()
}

export function handleVotingDelayChanged(event: VotingDelayChangedEvent): void {
  const governor = getOrCreateGovernor()

  governor.votingDelay = event.params.newValue

  governor.updatedAtBlockNumber = event.block.number
  governor.updatedAtBlockTimestamp = event.block.timestamp
  governor.updatedFromTransactionHash = event.transaction.hash

  governor.save()
}

export function handleBreakGlassGuardianChanged(
  event: BreakGlassGuardianChangedEvent
): void {
  const governor = getOrCreateGovernor()

  governor.breakGlassGuardian = event.params.newValue

  governor.updatedAtBlockNumber = event.block.number
  governor.updatedAtBlockTimestamp = event.block.timestamp
  governor.updatedFromTransactionHash = event.transaction.hash

  governor.save()
}

export function handleGovernanceReturnAddressChanged(
  event: GovernanceReturnAddressChangedEvent
): void {
  const governor = getOrCreateGovernor()

  governor.governanceReturnAddress = event.params.newValue

  governor.updatedAtBlockNumber = event.block.number
  governor.updatedAtBlockTimestamp = event.block.timestamp
  governor.updatedFromTransactionHash = event.transaction.hash

  governor.save()

}

export function handleQuorumVotesChanged(
  event: QuorumVotesChangedEvent
): void {
  const governor = getOrCreateGovernor()

  governor.quorumVotes = event.params.newValue

  governor.updatedAtBlockNumber = event.block.number
  governor.updatedAtBlockTimestamp = event.block.timestamp
  governor.updatedFromTransactionHash = event.transaction.hash

  governor.save()
}

export function getOrCreateGovernor(): Governor {
  let governor = Governor.load("1")
  if (governor == null) {
    governor = new Governor("1")
    governor.address = Address.fromString(GOVERNOR_BRAVO_ADDRESS)

    let governorContract = GovernorBravo.bind(Address.fromString(GOVERNOR_BRAVO_ADDRESS))
    governor.breakGlassGuardian = governorContract.breakGlassGuardian()
    governor.governanceReturnAddress = governorContract.governanceReturnAddress()
    governor.proposalThreshold = governorContract.proposalThreshold()
    governor.proposalMaxOperations = governorContract.proposalMaxOperations()
    governor.quorumVotes = governorContract.quorumVotes()
    governor.votingDelay = governorContract.votingDelay()
  }
  return governor
}
function mapActionTitles(targets: Bytes[], values: BigInt[], signatures: string[], calldatas: Bytes[]): string[] {
  const titles: string[] = []

  for (let i = 0; i < targets.length; i++) {
    // calldata only contains the parameters tuple, not the function name
    // so here we split the function name and the tuple signature
    const functionName = signatures[i].slice(0, signatures[i].indexOf("("))
    const tupleSignature = signatures[i].slice(signatures[i].indexOf("("))

    const decoded = ethereum.decode(tupleSignature, calldatas[i])

    if (decoded) {
      titles.push(`${targets[i].toHexString()}.${functionName}${stringifyValue(decoded)}`)
    }
    else {
      titles.push(`${targets[i].toHexString()}.${functionName}()`)
    }
  }

  return titles
}

function stringifyValue(value: ethereum.Value): string {
  switch (value.kind) {
    case ethereum.ValueKind.ADDRESS:
      return value.toAddress().toHexString()
    case ethereum.ValueKind.FIXED_BYTES:
    case ethereum.ValueKind.BYTES:
      return value.toBytes().toHexString()
    case ethereum.ValueKind.INT:
    case ethereum.ValueKind.UINT:
      return value.toBigInt().toString()
    case ethereum.ValueKind.BOOL:
      return value.toBoolean().toString()
    case ethereum.ValueKind.STRING:
      return `"${value.toString()}"`
    case ethereum.ValueKind.FIXED_ARRAY:
    case ethereum.ValueKind.ARRAY:
      return "["
        + value.toArray().map<string>((v: ethereum.Value) => stringifyValue(v)).join(", ")
        + "]"
    case ethereum.ValueKind.TUPLE:
      return "("
        + value.toTuple().map<string>((v: ethereum.Value) => stringifyValue(v)).join(", ")
        + ")"
    default:
      return ""
  }
}