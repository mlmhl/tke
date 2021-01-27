import * as React from 'react';
import { connect } from 'react-redux';

import { bindActionCreators } from '@tencent/ff-redux';

import { allActions } from '../../../actions';
import { RootProps } from '../../ClusterApp';
import { EditResourceAnnotations } from './EditResourceAnnotations';
import { EditResourceImagePullSecretsPanel } from './EditResourceImagePullSecretsPanel';
import { EditResourceNodeAffinityPanel } from './EditResourceNodeAffinityPanel';

interface EditResourceAdvancedPanelProps extends RootProps {
  /** 是否展示高级设置 */
  isOpenAdvanced: boolean;
}

const mapDispatchToProps = dispatch =>
  Object.assign({}, bindActionCreators({ actions: allActions }, dispatch), { dispatch });

@connect(state => state, mapDispatchToProps)
export class EditResourceAdvancedPanel extends React.Component<EditResourceAdvancedPanelProps, {}> {
  render() {
    let { isOpenAdvanced, subRoot, actions } = this.props,
      { workloadEdit } = subRoot,
      { networkType, floatingIPReleasePolicy } = workloadEdit;

    // let isShowPort = networkType !== 'Overlay';

    return isOpenAdvanced ? (
      <React.Fragment>
        <EditResourceImagePullSecretsPanel />
        <EditResourceNodeAffinityPanel />
        <EditResourceAnnotations />
        {/* <FormItem label={t('端口')} isShow={isShowPort}>
        </FormItem> */}
      </React.Fragment>
    ) : (
      <noscript />
    );
  }
}
