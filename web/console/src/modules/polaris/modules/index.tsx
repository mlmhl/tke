/**
 * 北极星模块（按页面最左侧的块划分，可能有多个子模块），这里为组织多个子模块的地方
 */
import React from 'react';
import { connect } from 'react-redux';
import Polaris from './polaris';
import { setProjects } from '@src/modules/polaris/features/polarisHeader/clustersAndProjectsSlice';
import { router } from '../router';
import store from '../modules/store';
import { bindActionCreators } from '@/lib/ff-redux';

interface ModuleNodeProps {
  isPlatform: boolean;
  projects: any[];
}

const mapDispatchToProps = (dispatch) =>
    Object.assign({}, bindActionCreators({ actions: {}}, dispatch), { dispatch });

@connect((state) => state, mapDispatchToProps)
@((router.serve as any)())
class Modules extends React.Component<any, {}> {
  componentDidUpdate(prevProps: Readonly<any>, prevState: Readonly<{}>, snapshot?: any): void {
    const currentProjects = this.props.projects;
    if (currentProjects !== prevProps.projects) {
      store.dispatch(setProjects(currentProjects));
    }
  }

  render() {
    const { isPlatform } = this.props;
    return (
      <Polaris
        isPlatform={isPlatform}
      />
    );
  }
}

export default Modules;

