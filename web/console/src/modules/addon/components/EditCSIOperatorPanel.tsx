import * as React from 'react';
import { connect } from 'react-redux';

import { FormPanel } from '@tencent/ff-component';
import { bindActionCreators } from '@tencent/ff-redux';
import { t } from '@tencent/tea-app/lib/i18n';
import { Input, Bubble, Icon } from '@tencent/tea-component';

import { allActions } from '../actions';
import { RootProps } from './AddonApp';

const mapDispatchToProps = dispatch =>
    Object.assign({}, bindActionCreators({ actions: allActions }, dispatch), { dispatch });

@connect(state => state, mapDispatchToProps)
export class EditCSIOperatorPanel extends React.Component<RootProps, any> {
  render() {
    let { editAddon, route, actions } = this.props,
        { peEdit } = editAddon,
        { kubeletUri, v_kubeletUri } = peEdit;

    let { rid } = route.queries;

    return (
      <React.Fragment>
        <FormPanel.Item
          validator={v_kubeletUri}
          label={
            <span>
              {t('kubelet 根路径')}
              <Bubble content={t('默认值为：/var/lib/kubelet')}>
                <Icon type="info" />
              </Bubble>
            </span>
          } errorTipsStyle="Bubble">
          <Input
            value={kubeletUri}
            onChange={value => {
              actions.editAddon.pe.inputKubeletUri(value);
            }}
            placeholder="eg: /var/lib/kubelet"
          />
        </FormPanel.Item>
      </React.Fragment>
    );
  }
}
