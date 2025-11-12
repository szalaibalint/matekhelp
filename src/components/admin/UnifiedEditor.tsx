import { useState } from 'react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Badge } from '../ui/badge';
import { 
  Plus, 
  Trash2, 
  ChevronUp, 
  ChevronDown,
  FileText,
  Presentation,
  HelpCircle,
  Play,
  PanelLeftClose,
  PanelLeft
} from 'lucide-react';
import { RichTextEditor } from './RichTextEditor';
import { SlideEditor } from './SlideEditor';
import { QuizEditor } from './QuizEditor';
import { Card, CardContent } from '../ui/card';
import { Descendant } from 'slate';

interface Block {
  id: string;
  type: 'document' | 'slide' | 'quiz';
  title: string;
  content: any;
  settings: any;
  sort_order: number;
}

interface UnifiedEditorProps {
  blocks: Block[];
  onChange: (blocks: Block[]) => void;
}

export function UnifiedEditor({ blocks, onChange }: UnifiedEditorProps) {
  const [selectedBlockIndex, setSelectedBlockIndex] = useState(0);
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const [previewBlockIndex, setPreviewBlockIndex] = useState(0);
  const [isBlocksPanelCollapsed, setIsBlocksPanelCollapsed] = useState(false);

  const selectedBlock = blocks[selectedBlockIndex];

  const addBlock = (type: Block['type']) => {
    const newBlock: Block = {
      id: `block-${Date.now()}`,
      type,
      title: `New ${type.charAt(0).toUpperCase() + type.slice(1)}`,
      content: getDefaultContent(type),
      settings: {},
      sort_order: blocks.length
    };

    const newBlocks = [...blocks, newBlock];
    onChange(newBlocks);
    setSelectedBlockIndex(newBlocks.length - 1);
  };

  const updateBlock = (index: number, updates: Partial<Block>) => {
    const newBlocks = [...blocks];
    newBlocks[index] = { ...newBlocks[index], ...updates };
    onChange(newBlocks);
  };

  const deleteBlock = (index: number) => {
    const newBlocks = blocks.filter((_, i) => i !== index);
    onChange(newBlocks);
    if (selectedBlockIndex >= newBlocks.length) {
      setSelectedBlockIndex(Math.max(0, newBlocks.length - 1));
    }
  };

  const moveBlock = (fromIndex: number, toIndex: number) => {
    const newBlocks = [...blocks];
    const [movedBlock] = newBlocks.splice(fromIndex, 1);
    newBlocks.splice(toIndex, 0, movedBlock);
    onChange(newBlocks);
    setSelectedBlockIndex(toIndex);
  };

  const getDefaultContent = (type: Block['type']) => {
    switch (type) {
      case 'document':
        return [{ type: 'paragraph', children: [{ text: 'Start writing...' }] }];
      case 'slide':
        return { slides: [] };
      case 'quiz':
        return { questions: [] };
      default:
        return {};
    }
  };

  const getBlockIcon = (type: Block['type']) => {
    switch (type) {
      case 'document': return <FileText className="h-4 w-4" />;
      case 'slide': return <Presentation className="h-4 w-4" />;
      case 'quiz': return <HelpCircle className="h-4 w-4" />;
    }
  };

  if (isPreviewMode) {
    return (
      <div className="h-full bg-gray-50 flex flex-col">
        <div className="p-4 bg-white border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-xl font-semibold">Preview Mode</h2>
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPreviewBlockIndex(Math.max(0, previewBlockIndex - 1))}
              disabled={previewBlockIndex === 0}
            >
              Previous
            </Button>
            <span className="text-sm">
              {previewBlockIndex + 1} / {blocks.length}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPreviewBlockIndex(Math.min(blocks.length - 1, previewBlockIndex + 1))}
              disabled={previewBlockIndex === blocks.length - 1}
            >
              Next
            </Button>
            <Button variant="outline" onClick={() => setIsPreviewMode(false)}>
              Exit Preview
            </Button>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-6">
          {blocks[previewBlockIndex] && (
            <div className="max-w-5xl mx-auto">
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center space-x-2 mb-4">
                    {getBlockIcon(blocks[previewBlockIndex].type)}
                    <h3 className="text-xl font-semibold">{blocks[previewBlockIndex].title}</h3>
                  </div>
                  {blocks[previewBlockIndex].type === 'document' && (
                    <div className="prose max-w-none">
                      <p>Document preview</p>
                    </div>
                  )}
                  {blocks[previewBlockIndex].type === 'slide' && (
                    <div>
                      <p>Slide preview - {blocks[previewBlockIndex].content.slides?.length || 0} slides</p>
                    </div>
                  )}
                  {blocks[previewBlockIndex].type === 'quiz' && (
                    <div>
                      <p>Quiz preview - {blocks[previewBlockIndex].content.questions?.length || 0} questions</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex">
      {/* Blocks Sidebar */}
      {!isBlocksPanelCollapsed ? (
        <div className="w-64 bg-gray-50 border-r border-gray-200 flex flex-col">
          <div className="p-4 border-b border-gray-200">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-medium">Blocks</h3>
              <div className="flex items-center space-x-1">
                <Select onValueChange={(type) => addBlock(type as Block['type'])}>
                  <SelectTrigger className="w-20 h-8">
                    <SelectValue placeholder="Add" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="document">Document</SelectItem>
                    <SelectItem value="slide">Slide</SelectItem>
                    <SelectItem value="quiz">Quiz</SelectItem>
                  </SelectContent>
                </Select>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsBlocksPanelCollapsed(true)}
                  className="h-8 w-8 p-0"
                >
                  <PanelLeftClose className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <Button 
              variant="outline" 
              size="sm" 
              className="w-full"
              onClick={() => setIsPreviewMode(true)}
              disabled={blocks.length === 0}
            >
              <Play className="h-4 w-4 mr-1" />
              Preview All
            </Button>
          </div>

          <div className="flex-1 overflow-y-auto p-2 space-y-2">
            {blocks.map((block, index) => (
              <Card
                key={block.id}
                className={`cursor-pointer transition-colors ${
                  selectedBlockIndex === index ? 'ring-2 ring-blue-500 bg-blue-50' : 'hover:bg-gray-100'
                }`}
                onClick={() => setSelectedBlockIndex(index)}
              >
                <CardContent className="p-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2 mb-1">
                        {getBlockIcon(block.type)}
                        <span className="text-xs font-medium capitalize">{block.type}</span>
                        <Badge variant="outline" className="text-xs">
                          {index + 1}
                        </Badge>
                      </div>
                      <p className="text-sm font-medium truncate">{block.title}</p>
                    </div>
                    
                    <div className="flex flex-col space-y-1 ml-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-6 w-6 p-0"
                        onClick={(e) => {
                          e.stopPropagation();
                          moveBlock(index, Math.max(0, index - 1));
                        }}
                        disabled={index === 0}
                      >
                        <ChevronUp className="h-3 w-3" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-6 w-6 p-0"
                        onClick={(e) => {
                          e.stopPropagation();
                          moveBlock(index, Math.min(blocks.length - 1, index + 1));
                        }}
                        disabled={index === blocks.length - 1}
                      >
                        <ChevronDown className="h-3 w-3" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-6 w-6 p-0"
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteBlock(index);
                        }}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      ) : (
        <div className="bg-gray-50 border-r border-gray-200 flex items-start p-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsBlocksPanelCollapsed(false)}
            className="h-8 w-8 p-0"
          >
            <PanelLeft className="h-4 w-4" />
          </Button>
        </div>
      )}

      {/* Main Editor */}
      <div className="flex-1 flex flex-col">
        {selectedBlock ? (
          <>
            <div className="border-b border-gray-200 p-3">
              <div className="flex items-center space-x-3">
                {getBlockIcon(selectedBlock.type)}
                <Input
                  value={selectedBlock.title}
                  onChange={(e) => updateBlock(selectedBlockIndex, { title: e.target.value })}
                  className="flex-1 max-w-md"
                />
                <Badge variant="outline">
                  Block {selectedBlockIndex + 1} of {blocks.length}
                </Badge>
              </div>
            </div>

            <div className="flex-1 overflow-hidden">
              {selectedBlock.type === 'document' && (
                <RichTextEditor
                  content={selectedBlock.content as Descendant[]}
                  onChange={(content) => updateBlock(selectedBlockIndex, { content })}
                />
              )}

              {selectedBlock.type === 'slide' && (
                <SlideEditor
                  content={selectedBlock.content}
                  onChange={(content) => updateBlock(selectedBlockIndex, { content })}
                />
              )}

              {selectedBlock.type === 'quiz' && (
                <QuizEditor
                  content={selectedBlock.content}
                  onChange={(content) => updateBlock(selectedBlockIndex, { content })}
                  onScoreChange={(totalPoints) => updateBlock(selectedBlockIndex, { 
                    settings: { ...selectedBlock.settings, totalPoints } 
                  })}
                />
              )}
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <FileText className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No blocks yet</h3>
              <p className="text-gray-500 mb-4">Create your first block to get started.</p>
              <Select onValueChange={(type) => addBlock(type as Block['type'])}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Create first block" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="document">Document</SelectItem>
                  <SelectItem value="slide">Slide</SelectItem>
                  <SelectItem value="quiz">Quiz</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}