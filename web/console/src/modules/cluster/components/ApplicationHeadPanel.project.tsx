import * as React from 'react';
import { connect } from 'react-redux';

import { FormPanel } from '@tencent/ff-component';
import { Layout, ExternalLink } from '@tencent/tea-component';
import { bindActionCreators, uuid } from '@tencent/ff-redux';
import { t, Trans } from '@tencent/tea-app/lib/i18n';

import { allActions } from '../actions';
import { RootProps } from './ApplicationApp.project';
const { Body, Content } = Layout;

const mapDispatchToProps = dispatch =>
  Object.assign({}, bindActionCreators({ actions: allActions }, dispatch), { dispatch });

@connect(state => state, mapDispatchToProps)
export class ApplicationHeadPanel extends React.Component<RootProps, {}> {
  render() {
    let { actions, projectList, rawProjectList, projectSelection, cluster } = this.props;
    /** 渲染业务列表 */
    let projectListOptions = projectList.map((p, index) => ({
      text: p.displayName,
      value: p.name
    }));
    if (WEBPACK_CONFIG_SHARED_CLUSTER) {
      projectListOptions = (rawProjectList || []).map(item => {
        const { name = '', annotations = {}} = item.metadata;
        const { 'teg.tkex.oa.com/department': department = '', 'teg.tkex.oa.com/business1': business1 = '', 'teg.tkex.oa.com/business2': business2 = '' } = annotations;
        const { displayName = '' } = item.spec;
        const text = `${displayName}（${name}: ${department} - ${business1} - ${business2}）`;
        return {
          text,
          value: name,
          tooltip: text
        };
      });
    }
    return (
      <Layout className="demo-layout">
        <Body>
          <Content>
            <Content.Header
              title="应用"
              operation={<ExternalLink href="https://iwiki.woa.com/pages/viewpage.action?pageId=510964128">远程调试指南</ExternalLink>}
            >
              <FormPanel.InlineText>{t('业务：')}</FormPanel.InlineText>
              <FormPanel.Select
                options={projectListOptions}
                value={projectSelection}
                size={WEBPACK_CONFIG_SHARED_CLUSTER ? 'l' : 'm'}
                onChange={value => {
                    if (WEBPACK_CONFIG_SHARED_CLUSTER) {
                      actions.resource.changeFilter({ search: '', selectedArea: '', selectedZone: '' });
                    }
                    actions.projectNamespace.selectProject(value);
                  }}
              ></FormPanel.Select>
            </Content.Header>
          </Content>
        </Body>
      </Layout>
    );
  }
}
