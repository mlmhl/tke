import * as React from 'react';
import { connect } from 'react-redux';

import { bindActionCreators } from '@tencent/ff-redux';
import { t } from '@tencent/tea-app/lib/i18n';
import { Radio } from '@tencent/tea-component';

import { FormItem } from '../../../../common';
import { allActions } from '../../../actions';
import {
  PodAffinityType,
  PodAffinityTypeList,
} from '../../../constants/Config';
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
        <FormItem label={t('实例(Pod)反亲和性')}>
          <Radio.Group
            defaultValue={PodAffinityType.unset}
            onChange={value => {
              actions.editWorkload.selectPodAffinity(value);
            }}
          >
            {PodAffinityTypeList.map(_ => (
              <Radio key={_.value} name={_.value} style={{ lineHeight: '18px' }}>
                {_.name}
              </Radio>
            ))}
          </Radio.Group>
        </FormItem>
        <EditResourceAnnotations />
        {/* <FormItem label={t('端口')} isShow={isShowPort}>
        </FormItem> */}
      </React.Fragment>
    ) : (
      <noscript />
    );
  }
}
