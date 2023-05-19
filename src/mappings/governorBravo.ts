import { Bytes } from "@graphprotocol/graph-ts"
import {
  BreakGlassGuardianChanged as BreakGlassGuardianChangedEvent,
  GovernanceReturnAddressChanged as GovernanceReturnAddressChangedEvent,
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
  BreakGlassGuardianChanged,
  GovernanceReturnAddressChanged,
  ProposalCanceled,
  ProposalCreated,
  ProposalExecuted,
  ProposalMaxOperationsChanged,
  ProposalQueued,
  ProposalThresholdChanged,
  QuorumVotesChanged,
  StartBlockSet,
  VoteCast,
  VotingDelayChanged
} from "../types/schema"

export function handleBreakGlassGuardianChanged(
  event: BreakGlassGuardianChangedEvent
): void {
  let entity = new BreakGlassGuardianChanged(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  )
  entity.oldValue = event.params.oldValue
  entity.newValue = event.params.newValue

  entity.blockNumber = event.block.number
  entity.blockTimestamp = event.block.timestamp
  entity.transactionHash = event.transaction.hash

  entity.save()
}

export function handleGovernanceReturnAddressChanged(
  event: GovernanceReturnAddressChangedEvent
): void {
  let entity = new GovernanceReturnAddressChanged(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  )
  entity.oldValue = event.params.oldValue
  entity.newValue = event.params.newValue

  entity.blockNumber = event.block.number
  entity.blockTimestamp = event.block.timestamp
  entity.transactionHash = event.transaction.hash

  entity.save()
}

export function handleProposalCanceled(event: ProposalCanceledEvent): void {
  let entity = new ProposalCanceled(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  )
  entity.GovernorBravo_id = event.params.id

  entity.blockNumber = event.block.number
  entity.blockTimestamp = event.block.timestamp
  entity.transactionHash = event.transaction.hash

  entity.save()
}

export function handleProposalCreated(event: ProposalCreatedEvent): void {
  let entity = new ProposalCreated(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  )
  entity.GovernorBravo_id = event.params.id
  entity.proposer = event.params.proposer
  entity.targets = event.params.targets.map<Bytes>(t => t as Bytes)
  entity.values = event.params.values
  entity.signatures = event.params.signatures
  entity.calldatas = event.params.calldatas
  entity.startTimestamp = event.params.startTimestamp
  entity.endTimestamp = event.params.endTimestamp
  entity.description = event.params.description
  entity.quorum = event.params.quorum

  entity.blockNumber = event.block.number
  entity.blockTimestamp = event.block.timestamp
  entity.transactionHash = event.transaction.hash

  entity.save()
}

export function handleProposalExecuted(event: ProposalExecutedEvent): void {
  let entity = new ProposalExecuted(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  )
  entity.GovernorBravo_id = event.params.id

  entity.blockNumber = event.block.number
  entity.blockTimestamp = event.block.timestamp
  entity.transactionHash = event.transaction.hash

  entity.save()
}

export function handleProposalMaxOperationsChanged(
  event: ProposalMaxOperationsChangedEvent
): void {
  let entity = new ProposalMaxOperationsChanged(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  )
  entity.oldValue = event.params.oldValue
  entity.newValue = event.params.newValue

  entity.blockNumber = event.block.number
  entity.blockTimestamp = event.block.timestamp
  entity.transactionHash = event.transaction.hash

  entity.save()
}

export function handleProposalQueued(event: ProposalQueuedEvent): void {
  let entity = new ProposalQueued(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  )
  entity.GovernorBravo_id = event.params.id
  entity.eta = event.params.eta

  entity.blockNumber = event.block.number
  entity.blockTimestamp = event.block.timestamp
  entity.transactionHash = event.transaction.hash

  entity.save()
}

export function handleProposalThresholdChanged(
  event: ProposalThresholdChangedEvent
): void {
  let entity = new ProposalThresholdChanged(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  )
  entity.oldValue = event.params.oldValue
  entity.newValue = event.params.newValue

  entity.blockNumber = event.block.number
  entity.blockTimestamp = event.block.timestamp
  entity.transactionHash = event.transaction.hash

  entity.save()
}

export function handleQuorumVotesChanged(event: QuorumVotesChangedEvent): void {
  let entity = new QuorumVotesChanged(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  )
  entity.oldValue = event.params.oldValue
  entity.newValue = event.params.newValue

  entity.blockNumber = event.block.number
  entity.blockTimestamp = event.block.timestamp
  entity.transactionHash = event.transaction.hash

  entity.save()
}

export function handleStartBlockSet(event: StartBlockSetEvent): void {
  let entity = new StartBlockSet(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  )
  entity.proposalId = event.params.proposalId
  entity.startBlock = event.params.startBlock

  entity.blockNumber = event.block.number
  entity.blockTimestamp = event.block.timestamp
  entity.transactionHash = event.transaction.hash

  entity.save()
}

export function handleVoteCast(event: VoteCastEvent): void {
  let entity = new VoteCast(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  )
  entity.voter = event.params.voter
  entity.proposalId = event.params.proposalId
  entity.voteValue = event.params.voteValue
  entity.votes = event.params.votes

  entity.blockNumber = event.block.number
  entity.blockTimestamp = event.block.timestamp
  entity.transactionHash = event.transaction.hash

  entity.save()
}

export function handleVotingDelayChanged(event: VotingDelayChangedEvent): void {
  let entity = new VotingDelayChanged(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  )
  entity.oldValue = event.params.oldValue
  entity.newValue = event.params.newValue

  entity.blockNumber = event.block.number
  entity.blockTimestamp = event.block.timestamp
  entity.transactionHash = event.transaction.hash

  entity.save()
}
