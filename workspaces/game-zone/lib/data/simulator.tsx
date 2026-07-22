import { ControlAccordion, SimAction, SimControl } from '@flowkit-features/simulator/controls'

export default function WorkspaceSimulatorControls() {
  return (
    <>
      <ControlAccordion label="User" defaultOpen>
        <SimControl label="Name" bind="db.user.name" />
        <SimControl label="Email" bind="db.user.email" />
        <SimControl label="Plan" bind="db.user.plan" options={['Free', 'Pro', 'Enterprise']} />
      </ControlAccordion>

      <ControlAccordion label="Items">
        <SimControl label="Items list" bind="db.items" />
      </ControlAccordion>

      <ControlAccordion label="Data">
        <SimAction
          label="Reset Database"
          icon="Trash2"
          badgeColor="red"
          onClick={ctx => ctx.resetDb()}
        />
      </ControlAccordion>
    </>
  )
}
