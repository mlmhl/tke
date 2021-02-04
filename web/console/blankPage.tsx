import React, { useState } from 'react';
import { Button } from '@tea/component/button';
import { Blank, BlankTheme } from '@tea/component/blank';
import { Card } from '@tea/component/card';
import { Layout } from '@tea/component/layout';
import { ContentView, ExternalLink } from '@tencent/tea-component';

const { Body, Content } = Layout;

function BlankExample() {
  return (
    <ContentView>
      <ContentView.Body>
        <Card full bordered={false}>
          <Blank
            theme={'permission'}
            description="您无所属项目或管理的集群为空，请先加入/新建业务"
            operation={
              <>
                <Button type="primary" onClick={() => {
                  const w = window.open('about:blank');
                  w.location.href = 'https://yunti.oa.com/tkebusiness/guide';
                }}>查看指引</Button>
              </>
            }
          />
        </Card>
      </ContentView.Body>
    </ContentView>
  );
}

export function BlankPage() {
  return (
    <div
      style={{
        margin: '40px'
      }}
    >
      <BlankExample />
    </div>
  );
}
