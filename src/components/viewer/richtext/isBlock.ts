const isBlock = (node: any) => {
  return !node.text && node.type !== 'link';
};

export default isBlock;
