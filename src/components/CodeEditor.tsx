import React, { useState, useEffect, useRef } from 'react';
import { Code, Eye, Play, Settings, Moon, Sun, Maximize2, Minimize2 } from 'lucide-react';

interface CodeEditorProps {
  initialHtml?: string;
  initialCss?: string;
  initialJs?: string;
}

const CodeEditor: React.FC<CodeEditorProps> = ({
  initialHtml = '<!DOCTYPE html>\n<html>\n<head>\n  <title>My Page</title>\n</head>\n<body>\n  <h1>Hello World!</h1>\n  <p>Start coding...</p>\n</body>\n</html>',
  initialCss = 'body {\n  font-family: Arial, sans-serif;\n  padding: 20px;\n  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);\n  color: white;\n}\n\nh1 {\n  text-align: center;\n  font-size: 3em;\n  text-shadow: 2px 2px 4px rgba(0,0,0,0.3);\n}',
  initialJs = '// Write your JavaScript here\nconsole.log("Editor loaded!");\n\n// Example: Add interactivity\ndocument.addEventListener("DOMContentLoaded", function() {\n  console.log("Page is ready!");\n});'
}) => {
  const [html, setHtml] = useState(initialHtml);
  const [css, setCss] = useState(initialCss);
  const [js, setJs] = useState(initialJs);
  const [activeTab, setActiveTab] = useState<'html' | 'css' | 'js'>('html');
  const [isDarkTheme, setIsDarkTheme] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [editorHeight, setEditorHeight] = useState(50);
  const [isResizing, setIsResizing] = useState(false);

  const iframeRef = useRef<HTMLIFrameElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const resizeStartY = useRef(0);
  const resizeStartHeight = useRef(0);

  useEffect(() => {
    const timer = setTimeout(() => {
      updatePreview();
    }, 500);

    return () => clearTimeout(timer);
  }, [html, css, js]);

  const updatePreview = () => {
    const iframe = iframeRef.current;
    if (!iframe) return;

    const document = iframe.contentDocument;
    if (!document) return;

    const content = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            ${css}
          </style>
        </head>
        <body>
          ${html}
          <script>
            try {
              ${js}
            } catch (error) {
              console.error('JavaScript Error:', error);
              document.body.insertAdjacentHTML('beforeend',
                '<div style="position:fixed;bottom:10px;right:10px;background:red;color:white;padding:10px;border-radius:5px;font-family:monospace;max-width:300px;">Error: ' + error.message + '</div>'
              );
            }
          </script>
        </body>
      </html>
    `;

    document.open();
    document.write(content);
    document.close();
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsResizing(true);
    resizeStartY.current = e.clientY;
    resizeStartHeight.current = editorHeight;
    e.preventDefault();
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing || !containerRef.current) return;

      const containerHeight = containerRef.current.offsetHeight;
      const deltaY = e.clientY - resizeStartY.current;
      const deltaPercent = (deltaY / containerHeight) * 100;
      const newHeight = Math.min(Math.max(resizeStartHeight.current + deltaPercent, 20), 80);

      setEditorHeight(newHeight);
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing]);

  const getLineNumbers = (code: string) => {
    const lines = code.split('\n').length;
    return Array.from({ length: lines }, (_, i) => i + 1);
  };

  const handleRunCode = () => {
    updatePreview();
  };

  const getCurrentCode = () => {
    switch (activeTab) {
      case 'html': return html;
      case 'css': return css;
      case 'js': return js;
    }
  };

  const setCurrentCode = (value: string) => {
    switch (activeTab) {
      case 'html': setHtml(value); break;
      case 'css': setCss(value); break;
      case 'js': setJs(value); break;
    }
  };

  return (
    <div
      ref={containerRef}
      className={`flex flex-col h-screen ${isDarkTheme ? 'bg-gray-900' : 'bg-gray-100'} ${isFullscreen ? 'fixed inset-0 z-50' : ''}`}
    >
      <div className={`${isDarkTheme ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} border-b px-4 py-3 flex items-center justify-between`}>
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <Code className={`w-5 h-5 ${isDarkTheme ? 'text-blue-400' : 'text-blue-600'}`} />
            <h1 className={`text-lg font-bold ${isDarkTheme ? 'text-white' : 'text-gray-800'}`}>
              Live Code Editor
            </h1>
          </div>

          <div className="flex space-x-1">
            <button
              onClick={() => setActiveTab('html')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                activeTab === 'html'
                  ? isDarkTheme ? 'bg-orange-600 text-white' : 'bg-orange-500 text-white'
                  : isDarkTheme ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              HTML
            </button>
            <button
              onClick={() => setActiveTab('css')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                activeTab === 'css'
                  ? isDarkTheme ? 'bg-blue-600 text-white' : 'bg-blue-500 text-white'
                  : isDarkTheme ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              CSS
            </button>
            <button
              onClick={() => setActiveTab('js')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                activeTab === 'js'
                  ? isDarkTheme ? 'bg-yellow-600 text-white' : 'bg-yellow-500 text-white'
                  : isDarkTheme ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              JavaScript
            </button>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={handleRunCode}
            className="flex items-center space-x-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors"
          >
            <Play className="w-4 h-4" />
            <span>Run</span>
          </button>

          <button
            onClick={() => setIsDarkTheme(!isDarkTheme)}
            className={`p-2 rounded-lg transition-colors ${
              isDarkTheme ? 'bg-gray-700 text-yellow-400 hover:bg-gray-600' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
            title={isDarkTheme ? 'Switch to Light Theme' : 'Switch to Dark Theme'}
          >
            {isDarkTheme ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
          </button>

          <button
            onClick={() => setIsFullscreen(!isFullscreen)}
            className={`p-2 rounded-lg transition-colors ${
              isDarkTheme ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
            title={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
          >
            {isFullscreen ? <Minimize2 className="w-5 h-5" /> : <Maximize2 className="w-5 h-5" />}
          </button>
        </div>
      </div>

      <div className="flex-1 flex flex-col overflow-hidden">
        <div
          className={`${isDarkTheme ? 'bg-gray-900' : 'bg-white'} overflow-hidden`}
          style={{ height: `${editorHeight}%` }}
        >
          <div className="h-full flex">
            <div className={`w-12 ${isDarkTheme ? 'bg-gray-800 border-gray-700' : 'bg-gray-100 border-gray-200'} border-r overflow-y-auto`}>
              {getLineNumbers(getCurrentCode()).map(num => (
                <div
                  key={num}
                  className={`text-xs text-right pr-2 py-0.5 ${isDarkTheme ? 'text-gray-500' : 'text-gray-400'}`}
                  style={{ fontFamily: 'monospace', lineHeight: '1.5' }}
                >
                  {num}
                </div>
              ))}
            </div>

            <textarea
              value={getCurrentCode()}
              onChange={(e) => setCurrentCode(e.target.value)}
              className={`flex-1 p-4 resize-none outline-none font-mono text-sm ${
                isDarkTheme
                  ? 'bg-gray-900 text-gray-100'
                  : 'bg-white text-gray-900'
              }`}
              style={{
                lineHeight: '1.5',
                tabSize: 2
              }}
              spellCheck={false}
              onKeyDown={(e) => {
                if (e.key === 'Tab') {
                  e.preventDefault();
                  const start = e.currentTarget.selectionStart;
                  const end = e.currentTarget.selectionEnd;
                  const value = e.currentTarget.value;
                  setCurrentCode(value.substring(0, start) + '  ' + value.substring(end));
                  setTimeout(() => {
                    e.currentTarget.selectionStart = e.currentTarget.selectionEnd = start + 2;
                  }, 0);
                }
              }}
            />
          </div>
        </div>

        <div
          className={`h-1 cursor-ns-resize ${isDarkTheme ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-300 hover:bg-gray-400'} transition-colors`}
          onMouseDown={handleMouseDown}
        >
          <div className="flex items-center justify-center h-full">
            <div className={`w-12 h-1 rounded-full ${isDarkTheme ? 'bg-gray-600' : 'bg-gray-400'}`}></div>
          </div>
        </div>

        <div
          className={`${isDarkTheme ? 'bg-gray-800' : 'bg-gray-200'} flex-1 overflow-hidden`}
        >
          <div className={`${isDarkTheme ? 'bg-gray-700 text-gray-300 border-gray-600' : 'bg-gray-100 text-gray-700 border-gray-300'} border-b px-4 py-2 flex items-center space-x-2`}>
            <Eye className="w-4 h-4" />
            <span className="text-sm font-medium">Live Preview</span>
          </div>

          <iframe
            ref={iframeRef}
            title="preview"
            sandbox="allow-scripts allow-same-origin"
            className="w-full h-full bg-white"
            style={{ border: 'none' }}
          />
        </div>
      </div>
    </div>
  );
};

export default CodeEditor;
