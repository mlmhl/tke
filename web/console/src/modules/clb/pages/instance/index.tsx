import React from 'react';
import { InstanceList } from './InstanceList';
import { RuleList } from './RuleList';

export default function CLBInstance(props) {
  return (
    <>
      <InstanceList {...props} />
      <RuleList {...props} />
    </>
  );
}
