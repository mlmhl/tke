import React, { useState, useEffect } from 'react';
import { Modal, Button } from '@tencent/tea-component';

interface PMProps {
  isPolarisInstalled: boolean;
}
const UninstalledPolarisModal = React.memo((props: PMProps) => {
  const { isPolarisInstalled } = props;
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    if (isPolarisInstalled === false) {
      setVisible(true);
    } else {
      //isPolarisInstalled 为 null || true 都不显示弹窗
      setVisible(false);
    }
  }, [isPolarisInstalled]);
  return (
    <Modal visible={visible} caption="服务未开通" onClose={() => {
      setVisible(false);
    }}>
      <Modal.Body>
        此集群尚未开通北极星服务，请联系 <strong>ianlang</strong> 进行安装。<br />
        <br />
        安装北极星时，我们会执行以下操作：<br />
        1. LBCF升级到1.4<br />
        2. 安装LBCF的北极星driver<br />
        <br />
        PS: LBCF升级过程中负载均衡会短时间不可用<br />
      </Modal.Body>
      <Modal.Footer>
        <Button type="primary" onClick={() => {
          setVisible(false);
        }}>
          确定
        </Button>
      </Modal.Footer>
    </Modal>
  );
});
export default UninstalledPolarisModal;
