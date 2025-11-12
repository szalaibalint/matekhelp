import React from 'react';

const UserInputElement = ({ attributes, element, children, isEditor = false, onAnswer, slideIndex, elementIndex, userAnswer, onEditClick }: any) => {
  if (isEditor) {
    return (
      <span
        {...attributes}
        contentEditable={false}
        className="inline-block bg-gray-100 border border-gray-300 rounded-md px-2 py-1 mx-1 text-sm cursor-pointer hover:bg-gray-200 transition-colors"
        onClick={onEditClick}
      >
        {element.placeholder || 'Answer'} ({element.correctAnswer} - {element.points} pont)
        {children}
      </span>
    );
  }

  // Check if we need to create multiple input fields (backslash separator)
  const hasMultipleFields = element.correctAnswer && element.correctAnswer.includes('\\');

  if (hasMultipleFields) {
    // First, check if we have multiple answer options (pipe separator)
    // If we do, we need to split each answer option by backslash
    const hasMultipleOptions = element.correctAnswer.includes('|');
    
    let fieldCount = 0;
    if (hasMultipleOptions) {
      // Take the first answer option to determine field count
      const firstOption = element.correctAnswer.split('|')[0];
      fieldCount = firstOption.split('\\').length;
    } else {
      fieldCount = element.correctAnswer.split('\\').length;
    }
    
    const userAnswers = userAnswer ? userAnswer.split('\\') : [];

    const handleMultiAnswerChange = (e: React.ChangeEvent<HTMLInputElement>, index: number) => {
      const newAnswers = [...userAnswers];
      newAnswers[index] = e.target.value;
      onAnswer(newAnswers.join('\\'), slideIndex, elementIndex);
    };

    return (
      <span {...attributes} contentEditable={false} className="inline-block">
        {Array.from({ length: fieldCount }).map((_, index) => (
          <React.Fragment key={index}>
            <input
              type="text"
              placeholder={element.placeholder || ''}
              className="inline-block w-6 border-b-2 border-gray-400 focus:border-blue-500 outline-none text-center"
              value={userAnswers[index] || ''}
              onChange={(e) => handleMultiAnswerChange(e, index)}
            />
            {index < fieldCount - 1 && <span className="mx-1">/</span>}
          </React.Fragment>
        ))}
        {children}
      </span>
    );
  }

  return (
    <span {...attributes} contentEditable={false} className="inline-block">
      <input
        type="text"
        placeholder={element.placeholder || '___'}
        className="inline-block w-32 border-b-2 border-gray-400 focus:border-blue-500 outline-none text-center"
        value={userAnswer || ''}
        onChange={(e) => onAnswer(e.target.value, slideIndex, elementIndex)}
      />
      {children}
    </span>
  );
};

export default UserInputElement;
