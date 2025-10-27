import React from 'react';
import CodeEditor from '../components/CodeEditor';

const CodePlayground: React.FC = () => {
  return (
    <div className="h-screen overflow-hidden">
      <CodeEditor />
    </div>
  );
};

export default CodePlayground;
