import React from 'react';
import { Modal, Button } from '@tencent/tea-component';
import { t, Trans } from '@tencent/tea-app/lib/i18n';

interface PolarisRemoveModal {
  polarisName: string;
  visible: boolean;
  toggle: (value?: boolean) => void;
  removePolaris: () => void;
}

const PolarisRemoveModal = React.memo((props: PolarisRemoveModal) => {
  const {
    polarisName,
    removePolaris,
    visible,
    toggle,
  } = props;
  return (
    <Modal visible={visible} caption="删除资源" onClose={() => toggle()}>
      <Modal.Body><Trans>您确定要删除规则：{polarisName} 吗？</Trans></Modal.Body>
      <Modal.Footer>
        <Button type="primary" onClick={() => {
          removePolaris();
        }}>
          确定
        </Button>
        <Button type="weak" onClick={() => toggle()}>
          取消
        </Button>
      </Modal.Footer>
    </Modal>
  );
});
export default PolarisRemoveModal;
