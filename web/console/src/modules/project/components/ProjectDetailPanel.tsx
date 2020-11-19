/**
 * 业务详情 - 基本信息
 */
import * as React from 'react';

import { FormPanel } from '@tencent/ff-component';
import { t } from '@tencent/tea-app/lib/i18n';
import { Form } from '@tea/component';

import { dateFormatter } from '../../../../helpers';
import { WorkflowDialog } from '../../common/components';
import { DialogBodyLayout } from '../../common/layouts';
import { EditProjectManagerPanel } from './EditProjectManagerPanel';
import { EditProjectNamePanel } from './EditProjectNamePanel';
import { RootProps } from './ProjectApp';
import { ProjectDetailResourcePanel } from './ProjectDetailResourcePanel';

const CMDBLabels = {
  'teg.tkex.oa.com/department': '部门',
  'teg.tkex.oa.com/business1': '一级业务',
  'teg.tkex.oa.com/business2': '二级业务',
  'teg.tkex.oa.com/creator': '创建人',
};

export class ProjectDetailPanel extends React.Component<RootProps, {}> {
  componentDidMount() {
    let { actions, cluster } = this.props;
    if (cluster.list.data.recordCount === 0) {
      actions.cluster.applyFilter({});
    }
  }

  render() {
    let { actions, projectDetail } = this.props;
    let cmdbInfo = {};
    if (projectDetail && projectDetail.metadata) {
      const { labels, annotations } = projectDetail.metadata;
      cmdbInfo = Object.assign({}, labels ? labels : {}, annotations ? annotations : {});
    }

    return projectDetail ? (
      <FormPanel title={t('基本信息')}>
        <FormPanel.Item
          label={t('业务名称')}
          text
          textProps={{
            onEdit: () => {
              actions.project.initEdition(projectDetail);
              actions.project.editProjectName.start([]);
            },
          }}
        >
          {projectDetail.spec.displayName}
        </FormPanel.Item>
        {Object.keys(CMDBLabels).map(
          item =>
            cmdbInfo[item] && (
              <Form.Item label={CMDBLabels[item]}>
                <Form.Text>{cmdbInfo[item]}</Form.Text>
              </Form.Item>
            )
        )}
        <ProjectDetailResourcePanel {...this.props} />
        <FormPanel.Item text label={t('创建时间')}>
          {dateFormatter(new Date(projectDetail.metadata.creationTimestamp), 'YYYY-MM-DD HH:mm:ss')}
        </FormPanel.Item>
        {this._renderEditProjectNameDialog()}
        {this._renderEditProjectManagerDialog()}
      </FormPanel>
    ) : (
      <noscript />
    );
  }
  private _renderEditProjectNameDialog() {
    const { actions, route, editProjectName, projectEdition } = this.props;
    return (
      <WorkflowDialog
        caption={t('编辑名称')}
        workflow={editProjectName}
        action={actions.project.editProjectName}
        targets={[projectEdition]}
        postAction={() => {
          actions.project.clearEdition();
        }}
        params={{}}
      >
        <DialogBodyLayout>
          <EditProjectNamePanel {...this.props} />
        </DialogBodyLayout>
      </WorkflowDialog>
    );
  }

  private _renderEditProjectManagerDialog() {
    const { actions, route, editProjectManager, projectEdition } = this.props;
    return (
      <WorkflowDialog
        caption={t('编辑成员')}
        workflow={editProjectManager}
        action={actions.project.editProjectManager}
        targets={[projectEdition]}
        postAction={() => {
          actions.project.clearEdition();
        }}
        params={{}}
        width={600}
      >
        <DialogBodyLayout>
          <EditProjectManagerPanel {...this.props} />
        </DialogBodyLayout>
      </WorkflowDialog>
    );
  }
}
