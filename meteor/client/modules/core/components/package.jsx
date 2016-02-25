import React from 'react';
import CommentList from '../../comments/containers/comment_list.js';

const package = ({package}) => (
  <div>
    {package.saving ? <p>Saving...</p> : null}
    <h2>{package.title}</h2>
    <p>
      {package.content}
    </p>
    <div>
      <h4>Comments</h4>
      <CommentList packageId={package._id}/>
    </div>
  </div>
);

export default package;
