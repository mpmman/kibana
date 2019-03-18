/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  EuiBasicTable,
  EuiButton,
  EuiButtonIcon,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiSelect,
} from '@elastic/eui';
import React from 'react';
import {
  Action,
  ActionFactory,
  actionFactoryRegistry,
  addTriggerActionMapping,
  deleteAction,
  Embeddable,
  getActionsForTrigger,
  saveAction,
  Trigger,
  triggerRegistry,
} from '../../../../../src/legacy/core_plugins/embeddable_api/public';
import { ActionEditor } from './action_editor';
import { CreateNewActionModal } from './create_new_action_modal';

interface Props {
  embeddable: Embeddable;
  actionTypes?: string[];
  hideTriggerIds?: string[];
  actionType?: string;
}

interface Event {
  actionId: string;
  triggerId: string;
  triggerTitle: string;
  actionTitle: string;
}

interface State {
  triggerMapping: { [key: string]: Action[] };
  selectedTrigger: string;
  showCreateModal: boolean;
  events: Event[];
  editAction?: Action;
}

export class EventEditor extends React.Component<Props, State> {
  private actions: Action[] = [];
  private triggers: Trigger[] = [];

  constructor(props: Props) {
    super(props);
    this.state = {
      triggerMapping: {},
      selectedTrigger: '',
      showCreateModal: false,
      events: [],
    };
  }

  public renderEvents() {
    return (
      <div>
        <EuiFlexGroup>
          <EuiFlexItem grow={true} />
          <EuiFlexItem grow={false}>
            <EuiFormRow hasEmptyLabelSpace>{this.renderCreateNewButton()}</EuiFormRow>
          </EuiFlexItem>
        </EuiFlexGroup>
        {this.renderExistingActions()}
      </div>
    );
  }

  public renderActionEditor() {
    const action = this.state.editAction;
    if (!action) {
      return null;
    }
    return (
      <ActionEditor
        clearEditor={() => {
          this.refreshEvents();
          this.setState({ editAction: undefined });
        }}
        action={action}
        embeddable={this.props.embeddable}
      />
    );
  }

  public render() {
    return (
      <div>
        {this.state.showCreateModal && this.renderCreateModal()}
        {this.state.editAction ? this.renderActionEditor() : this.renderEvents()}
      </div>
    );
  }

  public async componentDidMount() {
    this.refreshEvents();
  }

  private async refreshEvents() {
    this.triggers = triggerRegistry.getTriggers().filter(trigger => {
      return !this.props.hideTriggerIds || !this.props.hideTriggerIds.find(id => id === trigger.id);
    });

    const triggerMapping: { [key: string]: Action[] } = {};
    const events: Event[] = [];
    const selectedId = '';
    const promises = this.triggers.map(async trigger => {
      if (!triggerMapping[trigger.id]) {
        triggerMapping[trigger.id] = [];
      }

      const actionsForTrigger = await getActionsForTrigger(trigger.id, {
        embeddable: this.props.embeddable,
        container: this.props.embeddable ? this.props.embeddable.container : undefined,
      });

      this.actions.push(...actionsForTrigger);

      events.push(
        ...actionsForTrigger.map(action => ({
          actionId: action.id,
          triggerId: trigger.id,
          triggerTitle: trigger.title,
          actionTitle: action.title,
        }))
      );
    });

    await Promise.all(promises);
    this.setState({ triggerMapping, selectedTrigger: selectedId, events });
  }

  private getActionFactoryOptions() {
    return Object.values(actionFactoryRegistry.getFactories())
      .filter(factory => {
        return (
          !factory.isSingleton() &&
          (!this.props.actionTypes || this.props.actionTypes.find(type => type === factory.id))
        );
      })
      .map((factory: ActionFactory) => ({
        value: factory.id,
        text: factory.title,
      }));
  }

  private renderCreateNewButton() {
    const actionTypes = this.props.actionTypes;
    if (actionTypes && actionTypes.length === 1) {
      return (
        <EuiButton onClick={() => this.createAction(actionTypes[0] || '')}>
          Create new {actionTypes[0]} action
        </EuiButton>
      );
    } else {
      return (
        <EuiSelect
          options={[{ text: 'Create new action', value: '' }].concat(
            this.getActionFactoryOptions()
          )}
          value=""
          onChange={e => this.createAction(e.target.value)}
        />
      );
    }
  }

  private closeModal = () => this.setState({ showCreateModal: false });

  private onCreate = (type: string) => {
    this.createAction(type);
    this.closeModal();
  };

  private createAction = async (type: string) => {
    const factory = actionFactoryRegistry.getFactoryById(type);
    const action = await factory.createNew();
    if (action) {
      if (this.props.embeddable) {
        action.embeddableId = this.props.embeddable.id;
        action.embeddableType = this.props.embeddable.type;
      }
      this.setState({ editAction: action });
    }
  };

  private renderCreateModal = () => {
    return (
      <CreateNewActionModal
        onClose={this.closeModal}
        onCreate={this.onCreate}
        actionTypes={this.props.actionTypes}
      />
    );
  };

  private removeTriggerMapping = async (actionId: string) => {
    // Need to delete the action as well.
    await deleteAction(actionId);

    this.setState(prevState => {
      const triggerMapping = { ...prevState.triggerMapping };
      triggerMapping[this.state.selectedTrigger] = triggerMapping[
        this.state.selectedTrigger
      ].filter(action => action.id !== actionId);
      return {
        triggerMapping,
      };
    });
  };

  private renderExistingActions() {
    const items = this.state.events;

    const columns = [
      {
        field: 'actionTitle',
        sortable: false,
        name: 'Action name',
      },
      {
        field: 'triggerTitle',
        sortable: false,
        name: 'Trigger',
      },

      {
        field: 'actionId',
        sortable: false,
        name: 'Actions',
        width: '100px',
        render: (id: string) => {
          const foundAction = this.actions.find(action => action.id === id);
          return (
            <EuiFlexGroup>
              <EuiFlexItem>
                <EuiButtonIcon
                  iconType="pencil"
                  disabled={!foundAction || !foundAction.allowEditing()}
                  onClick={() => this.setState({ editAction: foundAction })}
                />
              </EuiFlexItem>
              <EuiFlexItem>
                <EuiButtonIcon iconType="trash" onClick={() => this.removeTriggerMapping(id)} />
              </EuiFlexItem>
            </EuiFlexGroup>
          );
        },
      },
    ];
    return <EuiBasicTable columns={columns} items={items} sorting={{}} />;
  }
}
