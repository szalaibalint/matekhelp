import React from 'react';
import BlockQuote from './elements/BlockQuote';
import BulletedList from './elements/BulletedList';
import HeadingOne from './elements/HeadingOne';
import HeadingTwo from './elements/HeadingTwo';
import HeadingThree from './elements/HeadingThree';
import ListItem from './elements/ListItem';
import NumberedList from './elements/NumberedList';
import ImageElement from './elements/ImageElement';
import VideoElement from './elements/VideoElement';
import LinkElement from './elements/LinkElement';
import Table from './elements/Table';
import TableRow from './elements/TableRow';
import TableCell from './elements/TableCell';
import DefaultElement from './elements/DefaultElement';
import UserInputElement from './elements/UserInputElement';
import MathElement from './elements/MathElement';

const Element = (props: any) => {
  switch (props.element.type) {
    case 'block-quote':
      return <BlockQuote {...props} />;
    case 'bulleted-list':
      return <BulletedList {...props} />;
    case 'heading-one':
      return <HeadingOne {...props} />;
    case 'heading-two':
      return <HeadingTwo {...props} />;
    case 'heading-three':
      return <HeadingThree {...props} />;
    case 'list-item':
      return <ListItem {...props} />;
    case 'numbered-list':
      return <NumberedList {...props} />;
    case 'image':
      return <ImageElement {...props} />;
    case 'video':
      return <VideoElement {...props} />;
    case 'link':
      return <LinkElement {...props} />;
    case 'table':
      return <Table {...props} />;
    case 'table-row':
      return <TableRow {...props} />;
    case 'table-cell':
      return <TableCell {...props} />;
    case 'input-field':
      return <UserInputElement {...props} />;
    case 'math-inline':
      return <MathElement {...props} isEditor={props.isEditor} />;
    default:
      return <DefaultElement {...props} />;
  }
};

export default Element;
