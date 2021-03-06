/**
 * @reactapi
 * @module components
 */ /** */
import * as React from 'react';
import { Component, cloneElement, ValidationMap } from 'react';
import * as PropTypes from 'prop-types';
import * as _classNames from 'classnames';

import { UIRouterReact, UISref, UIRouterConsumer } from '../index';
import { UIViewAddress } from './UIView';
import { UIRouterInstanceUndefinedError } from './UIRouter';

import { UIViewConsumer } from './UIView';

let classNames = _classNames;

export interface UISrefActiveProps {
  parentUIView: UIViewAddress;
  router: UIRouterReact;
  class?: string;
  exact?: Boolean;
  children?: any;
}

export interface UISrefActiveState {
  state: { name?: string; [key: string]: any };
  params: Object;
  hash: string;
}

export const StateNameMustBeAStringError = new Error('State name provided to <UISref {to}> must be a string.');

/** @internalapi */
export const { Provider: UISrefActiveProvider, Consumer: UISrefActiveConsumer } = React.createContext<Function>(
  undefined
);

class SrefActive extends Component<UISrefActiveProps, any> {
  // keep track of states to watch and their activeClasses
  states: Array<UISrefActiveState> = [];
  activeClasses: { [key: string]: string } = {};

  // deregister the callback for state changed when unmounted
  deregister: Function;

  static propTypes = {
    parentUIView: PropTypes.object,
    router: PropTypes.object.isRequired,
    class: PropTypes.string.isRequired,
    children: PropTypes.element.isRequired,
  };

  state = {
    activeClasses: '',
  };

  componentWillMount() {
    const router = this.props.router;
    if (typeof router === 'undefined') {
      throw UIRouterInstanceUndefinedError;
    }
    // register callback for state change
    this.deregister = router.transitionService.onSuccess({}, () => this.updateActiveClasses());
  }

  componentWillUnmount() {
    this.deregister();
  }

  addStateInfo = (stateName, stateParams) => {
    const activeClass = this.props.class;
    let deregister = this.addState(stateName, stateParams, activeClass);
    this.updateActiveClasses();
    return deregister;
  };

  addState = (stateName, stateParams, activeClass) => {
    const { stateService } = this.props.router;
    let parent = this.props.parentUIView;
    let stateContext = (parent && parent.context) || this.props.router.stateRegistry.root();
    let state = stateService.get(stateName, stateContext);
    let stateHash = this.createStateHash(stateName, stateParams);
    let stateInfo = {
      state: state || { name: stateName },
      params: stateParams,
      hash: stateHash,
    };
    this.states.push(stateInfo);
    this.activeClasses[stateHash] = activeClass;
    return () => {
      let idx = this.states.indexOf(stateInfo);
      if (idx !== -1) this.states.splice(idx, 1);
    };
  };

  createStateHash = (state: string, params: Object) => {
    if (typeof state !== 'string') {
      throw StateNameMustBeAStringError;
    }
    return params && typeof params === 'object' ? state + JSON.stringify(params) : state;
  };

  getActiveClasses = (): string => {
    let activeClasses = [];
    let { stateService } = this.props.router;
    let { exact } = this.props;
    this.states.forEach(s => {
      let { state, params, hash } = s;
      if (!exact && stateService.includes(state.name, params)) activeClasses.push(this.activeClasses[hash]);
      if (exact && stateService.is(state.name, params)) activeClasses.push(this.activeClasses[hash]);
    });
    return classNames(activeClasses);
  };

  updateActiveClasses = (): void => {
    const { activeClasses } = this.state;
    const newActiveClasses = this.getActiveClasses();
    if (activeClasses !== newActiveClasses) {
      this.setState({
        activeClasses: this.getActiveClasses(),
      });
    }
  };

  render() {
    const { activeClasses } = this.state;
    const children =
      activeClasses.length > 0
        ? cloneElement(
            this.props.children,
            Object.assign({}, this.props.children.props, {
              className: classNames(this.props.children.props.className, activeClasses),
            })
          )
        : this.props.children;
    return <UISrefActiveProvider value={this.addStateInfo}>{children}</UISrefActiveProvider>;
  }
}

export const UISrefActive = props => (
  <UIRouterConsumer>
    {router => (
      <UIViewConsumer>
        {parentUIView => <SrefActive {...props} router={router} parentUIView={parentUIView} />}
      </UIViewConsumer>
    )}
  </UIRouterConsumer>
);

(UISrefActive as any).displayName = 'UISrefActive';
