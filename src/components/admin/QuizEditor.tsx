import React, { useState } from 'react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Checkbox } from '../ui/checkbox';
import { RadioGroup, RadioGroupItem } from '../ui/radio-group';
import { Label } from '../ui/label';
import { Badge } from '../ui/badge';
import { 
  Plus, 
  Trash2, 
  ChevronUp, 
  ChevronDown, 
  Play, 
  CheckCircle,
  XCircle,
  HelpCircle,
  Edit,
  Save
} from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../ui/dialog';
import { Slider } from '../ui/slider';

interface QuizQuestion {
  id: string;
  question_text: string;
  question_type: 'multiple_choice' | 'true_false' | 'short_answer' | 'matching';
  options: string[];
  correct_answer: any;
  points: number;
  explanation?: string;
}

interface QuizEditorProps {
  content: { questions: QuizQuestion[] };
  onChange: (content: { questions: QuizQuestion[] }) => void;
  onScoreChange: (totalPoints: number) => void;
}

export function QuizEditor({ content, onChange, onScoreChange }: QuizEditorProps) {
  const [selectedQuestionIndex, setSelectedQuestionIndex] = useState<number | null>(null);
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const [previewAnswers, setPreviewAnswers] = useState<{ [key: string]: any }>({});
  const [showResults, setShowResults] = useState(false);

  const questions = content.questions || [];
  const selectedQuestion = selectedQuestionIndex !== null ? questions[selectedQuestionIndex] : null;
  const totalPoints = questions.reduce((sum, q) => sum + q.points, 0);

  // Update total points when questions change
  React.useEffect(() => {
    onScoreChange(totalPoints);
  }, [totalPoints, onScoreChange]);

  const addQuestion = (type: QuizQuestion['question_type']) => {
    const newQuestion: QuizQuestion = {
      id: `question-${Date.now()}`,
      question_text: 'Új kérdés',
      question_type: type,
      options: type === 'multiple_choice' ? ['1. opció', '2. opció', '3. opció', '4. opció'] :
               type === 'true_false' ? ['Igaz', 'Hamis'] :
               type === 'matching' ? ['1. elem', '2. elem', '3. elem'] : [],
      correct_answer: type === 'multiple_choice' ? 0 :
                     type === 'true_false' ? 0 :
                     type === 'short_answer' ? '' :
                     type === 'matching' ? {} : null,
      points: 1,
      explanation: ''
    };

    const newQuestions = [...questions, newQuestion];
    onChange({ questions: newQuestions });
    setSelectedQuestionIndex(newQuestions.length - 1);
  };

  const updateQuestion = (index: number, updates: Partial<QuizQuestion>) => {
    const newQuestions = [...questions];
    newQuestions[index] = { ...newQuestions[index], ...updates };
    onChange({ questions: newQuestions });
  };

  const deleteQuestion = (index: number) => {
    const newQuestions = questions.filter((_, i) => i !== index);
    onChange({ questions: newQuestions });
    if (selectedQuestionIndex === index) {
      setSelectedQuestionIndex(null);
    } else if (selectedQuestionIndex !== null && selectedQuestionIndex > index) {
      setSelectedQuestionIndex(selectedQuestionIndex - 1);
    }
  };

  const moveQuestion = (fromIndex: number, toIndex: number) => {
    const newQuestions = [...questions];
    const [movedQuestion] = newQuestions.splice(fromIndex, 1);
    newQuestions.splice(toIndex, 0, movedQuestion);
    onChange({ questions: newQuestions });
    setSelectedQuestionIndex(toIndex);
  };

  const calculateScore = () => {
    let score = 0;
    questions.forEach((question, index) => {
      const userAnswer = previewAnswers[question.id];
      if (isAnswerCorrect(question, userAnswer)) {
        score += question.points;
      }
    });
    return score;
  };

  const isAnswerCorrect = (question: QuizQuestion, userAnswer: any) => {
    switch (question.question_type) {
      case 'multiple_choice':
      case 'true_false':
        return userAnswer === question.correct_answer;
      case 'short_answer':
        return userAnswer?.toLowerCase().trim() === question.correct_answer?.toLowerCase().trim();
      case 'matching':
        return JSON.stringify(userAnswer) === JSON.stringify(question.correct_answer);
      default:
        return false;
    }
  };

  if (isPreviewMode) {
    return (
      <div className="h-full bg-gray-50 flex flex-col">
        <div className="p-4 bg-white border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-xl font-semibold">Kvíz Előnézet</h2>
          <div className="flex items-center space-x-2">
            {!showResults && (
              <Button onClick={() => setShowResults(true)}>
                Kvíz Leadása
              </Button>
            )}
            <Button variant="outline" onClick={() => {
              setIsPreviewMode(false);
              setShowResults(false);
              setPreviewAnswers({});
            }}>
              Előnézet Elhagyása
            </Button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {showResults ? (
            <QuizResults 
              questions={questions}
              answers={previewAnswers}
              score={calculateScore()}
              totalPoints={totalPoints}
            />
          ) : (
            <div className="max-w-4xl mx-auto space-y-6">
              {questions.map((question, index) => (
                <Card key={question.id}>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <span>{index + 1}. Kérdés</span>
                      <Badge variant="outline">{question.points} pont</Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <QuestionPreview
                      question={question}
                      userAnswer={previewAnswers[question.id]}
                      onAnswerChange={(answer) => setPreviewAnswers(prev => ({
                        ...prev,
                        [question.id]: answer
                      }))}
                    />
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex">
      {/* Questions List */}
      <div className="w-80 bg-gray-50 border-r border-gray-200 flex flex-col">
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-medium">Kérdések</h3>
            <div className="flex items-center space-x-1">
              <Select onValueChange={(type) => addQuestion(type as QuizQuestion['question_type'])}>
                <SelectTrigger className="w-32">
                  <SelectValue placeholder="Hozzáadás..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="multiple_choice">Feleletválasztós</SelectItem>
                  <SelectItem value="true_false">Igaz/Hamis</SelectItem>
                  <SelectItem value="short_answer">Rövid Válasz</SelectItem>
                  <SelectItem value="matching">Párosítás</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <div className="flex items-center justify-between text-sm text-gray-600">
            <span>{questions.length} kérdés</span>
            <span>{totalPoints} pont</span>
          </div>
          
          <Button 
            variant="outline" 
            size="sm" 
            className="w-full mt-3"
            onClick={() => setIsPreviewMode(true)}
            disabled={questions.length === 0}
          >
            <Play className="h-4 w-4 mr-1" />
            Kvíz Előnézete
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto p-2 space-y-2">
          {questions.map((question, index) => (
            <Card
              key={question.id}
              className={`cursor-pointer transition-colors ${
                selectedQuestionIndex === index ? 'ring-2 ring-blue-500 bg-blue-50' : 'hover:bg-gray-100'
              }`}
              onClick={() => setSelectedQuestionIndex(index)}
            >
              <CardContent className="p-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2 mb-1">
                      <span className="text-sm font-medium">K{index + 1}</span>
                      <Badge variant="outline" className="text-xs">
                        {translateQuestionType(question.question_type)}
                      </Badge>
                    </div>
                    <p className="text-sm text-gray-600 truncate">{question.question_text}</p>
                    <div className="flex items-center justify-between mt-2">
                      <span className="text-xs text-gray-500">{question.points} pont</span>
                    </div>
                  </div>
                  
                  <div className="flex flex-col space-y-1 ml-2">
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-6 w-6 p-0"
                      onClick={(e) => {
                        e.stopPropagation();
                        moveQuestion(index, Math.max(0, index - 1));
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
                        moveQuestion(index, Math.min(questions.length - 1, index + 1));
                      }}
                      disabled={index === questions.length - 1}
                    >
                      <ChevronDown className="h-3 w-3" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-6 w-6 p-0"
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteQuestion(index);
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

      {/* Question Editor */}
      <div className="flex-1 flex flex-col">
        {selectedQuestion && selectedQuestionIndex !== null ? (
          <>
            <div className="border-b border-gray-200 p-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold">
                  {selectedQuestionIndex + 1}. Kérdés - {translateQuestionType(selectedQuestion.question_type)}
                </h2>
                <Badge variant="outline">
                  {selectedQuestion.points} pont
                </Badge>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              <QuestionEditor
                question={selectedQuestion}
                onUpdate={(updates) => updateQuestion(selectedQuestionIndex, updates)}
              />
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <HelpCircle className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Nincs kérdés kiválasztva</h3>
              <p className="text-gray-500 mb-4">Válassz ki egy kérdést a szerkesztéshez, vagy hozz létre egy újat.</p>
              <Select onValueChange={(type) => addQuestion(type as QuizQuestion['question_type'])}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Hozd létre az első kérdésed" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="multiple_choice">Feleletválasztós</SelectItem>
                  <SelectItem value="true_false">Igaz/Hamis</SelectItem>
                  <SelectItem value="short_answer">Rövid Válasz</SelectItem>
                  <SelectItem value="matching">Párosítás</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

const translateQuestionType = (type: string) => {
  switch (type) {
    case 'multiple_choice': return 'Feleletválasztós';
    case 'true_false': return 'Igaz/Hamis';
    case 'short_answer': return 'Rövid válasz';
    case 'matching': return 'Párosítás';
    default: return type.replace('_', ' ');
  }
};

const QuestionEditor = ({ question, onUpdate }: { question: QuizQuestion; onUpdate: (updates: Partial<QuizQuestion>) => void }) => {
  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Kérdés Szövege</label>
        <Textarea
          value={question.question_text}
          onChange={(e) => onUpdate({ question_text: e.target.value })}
          placeholder="Írd be a kérdést..."
          rows={3}
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Pontok</label>
        <Slider
          value={[question.points]}
          onValueChange={([points]) => onUpdate({ points })}
          min={1}
          max={10}
          step={1}
          className="w-32"
        />
        <span className="text-sm text-gray-500">{question.points} pont</span>
      </div>

      {question.question_type === 'multiple_choice' && (
        <MultipleChoiceEditor question={question} onUpdate={onUpdate} />
      )}

      {question.question_type === 'true_false' && (
        <TrueFalseEditor question={question} onUpdate={onUpdate} />
      )}

      {question.question_type === 'short_answer' && (
        <ShortAnswerEditor question={question} onUpdate={onUpdate} />
      )}

      {question.question_type === 'matching' && (
        <MatchingEditor question={question} onUpdate={onUpdate} />
      )}

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Magyarázat (Opcionális)</label>
        <Textarea
          value={question.explanation || ''}
          onChange={(e) => onUpdate({ explanation: e.target.value })}
          placeholder="Adj magyarázatot a helyes válaszhoz..."
          rows={2}
        />
      </div>
    </div>
  );
};

const MultipleChoiceEditor = ({ question, onUpdate }: any) => {
  const addOption = () => {
    const newOptions = [...question.options, `Opció ${question.options.length + 1}`];
    onUpdate({ options: newOptions });
  };

  const updateOption = (index: number, value: string) => {
    const newOptions = [...question.options];
    newOptions[index] = value;
    onUpdate({ options: newOptions });
  };

  const removeOption = (index: number) => {
    if (question.options.length <= 2) return;
    const newOptions = question.options.filter((_: any, i: number) => i !== index);
    const correctAnswer = question.correct_answer >= index ? Math.max(0, question.correct_answer - 1) : question.correct_answer;
    onUpdate({ options: newOptions, correct_answer: correctAnswer });
  };

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2">Válaszlehetőségek</label>
      <div className="space-y-2">
        {question.options.map((option: string, index: number) => (
          <div key={index} className="flex items-center space-x-2">
            <RadioGroup
              value={question.correct_answer?.toString()}
              onValueChange={(value) => onUpdate({ correct_answer: parseInt(value) })}
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value={index.toString()} id={`option-${index}`} />
                <Label htmlFor={`option-${index}`} className="sr-only">Helyes válasz</Label>
              </div>
            </RadioGroup>
            <Input
              value={option}
              onChange={(e) => updateOption(index, e.target.value)}
              placeholder={`Opció ${index + 1}`}
              className="flex-1"
            />
            <Button
              size="sm"
              variant="ghost"
              onClick={() => removeOption(index)}
              disabled={question.options.length <= 2}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ))}
      </div>
      <Button size="sm" variant="outline" onClick={addOption} className="mt-2">
        <Plus className="h-4 w-4 mr-1" />
        Opció Hozzáadása
      </Button>
    </div>
  );
};

const TrueFalseEditor = ({ question, onUpdate }: any) => (
  <div>
    <label className="block text-sm font-medium text-gray-700 mb-2">Helyes Válasz</label>
    <RadioGroup
      value={question.correct_answer?.toString()}
      onValueChange={(value) => onUpdate({ correct_answer: parseInt(value) })}
    >
      <div className="flex items-center space-x-2">
        <RadioGroupItem value="0" id="true" />
        <Label htmlFor="true">Igaz</Label>
      </div>
      <div className="flex items-center space-x-2">
        <RadioGroupItem value="1" id="false" />
        <Label htmlFor="false">Hamis</Label>
      </div>
    </RadioGroup>
  </div>
);

const ShortAnswerEditor = ({ question, onUpdate }: any) => (
  <div>
    <label className="block text-sm font-medium text-gray-700 mb-2">Helyes Válasz</label>
    <Input
      value={question.correct_answer || ''}
      onChange={(e) => onUpdate({ correct_answer: e.target.value })}
      placeholder="Írd be a helyes választ..."
    />
    <p className="text-xs text-gray-500 mt-1">A válasz nem számít kis- és nagybetűérzékenynek</p>
  </div>
);

const MatchingEditor = ({ question, onUpdate }: any) => {
  // Simplified matching editor - you can expand this
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2">Párosítandó Elemek</label>
      <p className="text-sm text-gray-500">A párosítós kérdések hamarosan érkeznek!</p>
    </div>
  );
};

const QuestionPreview = ({ question, userAnswer, onAnswerChange }: any) => {
  return (
    <div className="space-y-4">
      <p className="text-lg font-medium">{question.question_text}</p>
      
      {question.question_type === 'multiple_choice' && (
        <RadioGroup value={userAnswer?.toString()} onValueChange={(value) => onAnswerChange(parseInt(value))}>
          {question.options.map((option: string, index: number) => (
            <div key={index} className="flex items-center space-x-2">
              <RadioGroupItem value={index.toString()} id={`preview-${question.id}-${index}`} />
              <Label htmlFor={`preview-${question.id}-${index}`}>{option}</Label>
            </div>
          ))}
        </RadioGroup>
      )}

      {question.question_type === 'true_false' && (
        <RadioGroup value={userAnswer?.toString()} onValueChange={(value) => onAnswerChange(parseInt(value))}>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="0" id={`preview-${question.id}-true`} />
            <Label htmlFor={`preview-${question.id}-true`}>Igaz</Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="1" id={`preview-${question.id}-false`} />
            <Label htmlFor={`preview-${question.id}-false`}>Hamis</Label>
          </div>
        </RadioGroup>
      )}

      {question.question_type === 'short_answer' && (
        <Input
          value={userAnswer || ''}
          onChange={(e) => onAnswerChange(e.target.value)}
          placeholder="Írd be a válaszod..."
        />
      )}
    </div>
  );
};

const QuizResults = ({ questions, answers, score, totalPoints }: any) => {
  const percentage = totalPoints > 0 ? Math.round((score / totalPoints) * 100) : 0;
  
  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-center">Kvíz Eredmények</CardTitle>
        </CardHeader>
        <CardContent className="text-center">
          <div className="text-4xl font-bold mb-2">
            {score} / {totalPoints}
          </div>
          <div className="text-2xl text-gray-600 mb-4">{percentage}%</div>
          <Badge variant={percentage >= 70 ? "default" : "destructive"} className="text-lg px-4 py-2">
            {percentage >= 70 ? "Sikeres" : "Sikertelen"}
          </Badge>
        </CardContent>
      </Card>

      {questions.map((question: QuizQuestion, index: number) => {
        const userAnswer = answers[question.id];
        const isCorrect = isAnswerCorrect(question, userAnswer);
        
        return (
          <Card key={question.id}>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <span>{index + 1}. Kérdés</span>
                {isCorrect ? (
                  <CheckCircle className="h-5 w-5 text-green-600" />
                ) : (
                  <XCircle className="h-5 w-5 text-red-600" />
                )}
                <Badge variant={isCorrect ? "default" : "destructive"}>
                  {isCorrect ? `+${question.points}` : '0'} pont
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="font-medium mb-3">{question.question_text}</p>
              
              {question.question_type === 'multiple_choice' && (
                <div className="space-y-2">
                  {question.options.map((option: string, optionIndex: number) => (
                    <div
                      key={optionIndex}
                      className={`p-2 rounded border ${
                        optionIndex === question.correct_answer ? 'bg-green-100 border-green-300' :
                        optionIndex === userAnswer ? 'bg-red-100 border-red-300' :
                        'bg-gray-50 border-gray-200'
                      }`}
                    >
                      {option}
                      {optionIndex === question.correct_answer && (
                        <CheckCircle className="inline h-4 w-4 ml-2 text-green-600" />
                      )}
                      {optionIndex === userAnswer && optionIndex !== question.correct_answer && (
                        <XCircle className="inline h-4 w-4 ml-2 text-red-600" />
                      )}
                    </div>
                  ))}
                </div>
              )}

              {question.explanation && (
                <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded">
                  <p className="text-sm"><strong>Magyarázat:</strong> {question.explanation}</p>
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};

function isAnswerCorrect(question: QuizQuestion, userAnswer: any): boolean {
  switch (question.question_type) {
    case 'multiple_choice':
    case 'true_false':
      return userAnswer === question.correct_answer;
    case 'short_answer':
      return userAnswer?.toLowerCase().trim() === question.correct_answer?.toLowerCase().trim();
    case 'matching':
      return JSON.stringify(userAnswer) === JSON.stringify(question.correct_answer);
    default:
      return false;
  }
}