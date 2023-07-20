import { Address, Bytes } from "@graphprotocol/graph-ts"
import {
  BreakGlassGuardianChanged as BreakGlassGuardianChangedEvent,
  GovernanceReturnAddressChanged as GovernanceReturnAddressChangedEvent,
  GovernorBravo,
  ProposalCanceled as ProposalCanceledEvent,
  ProposalCreated as ProposalCreatedEvent,
  ProposalExecuted as ProposalExecutedEvent,
  ProposalMaxOperationsChanged as ProposalMaxOperationsChangedEvent,
  ProposalQueued as ProposalQueuedEvent,
  ProposalThresholdChanged as ProposalThresholdChangedEvent,
  QuorumVotesChanged as QuorumVotesChangedEvent,
  StartBlockSet as StartBlockSetEvent,
  VoteCast as VoteCastEvent,
  VotingDelayChanged as VotingDelayChangedEvent
} from "../types/GovernorBravo/GovernorBravo"
import {
  Governor,
  Proposal,
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

  let governor = getOrCreateGovernor();

  proposal.proposer = event.params.proposer
  proposal.targets = event.params.targets.map<Bytes>(t => t as Bytes)
  proposal.values = event.params.values
  proposal.signatures = event.params.signatures
  proposal.calldatas = event.params.calldatas
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
  }
}

export function handleProposalExecuted(event: ProposalExecutedEvent): void {
  let proposalID = event.params.id.toHex()
  let proposal = Proposal.load(proposalID)
  if (proposal != null) {
    proposal.state = "Executed"
    proposal.executionTransaction = event.transaction.hash

    proposal.updatedAtBlockNumber = event.block.number
    proposal.updatedAtBlockTimestamp = event.block.timestamp
    proposal.updatedFromTransactionHash = event.transaction.hash

    proposal.save()
  }
}

export function handleProposalQueued(event: ProposalQueuedEvent): void {
  let proposalID = event.params.id.toHex()
  let proposal = Proposal.load(proposalID)
  if (proposal != null) {
    proposal.state = "Queued"

    proposal.updatedAtBlockNumber = event.block.number
    proposal.updatedAtBlockTimestamp = event.block.timestamp
    proposal.updatedFromTransactionHash = event.transaction.hash

    proposal.save()
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
  }
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

export function handleQuorumVotesChanged(event: QuorumVotesChangedEvent): void {
  const governor = getOrCreateGovernor()

  governor.quorumVotes = event.params.newValue

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

export function getOrCreateGovernor(): Governor {
  let governor = Governor.load("1")
  if (governor == null) {
    governor = new Governor("1")
    governor.address = Address.fromString(GOVERNOR_BRAVO_ADDRESS)

    let governorContract = GovernorBravo.bind(Address.fromString(GOVERNOR_BRAVO_ADDRESS));

    governor.breakGlassGuardian = governorContract.breakGlassGuardian()
    governor.governanceReturnAddress = governorContract.governanceReturnAddress()
    governor.proposalThreshold = governorContract.proposalThreshold()
    governor.proposalMaxOperations = governorContract.proposalMaxOperations()
    governor.quorumVotes = governorContract.quorumVotes()
    governor.votingDelay = governorContract.votingDelay()
  }
  return governor
}
