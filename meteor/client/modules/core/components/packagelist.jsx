import React from 'react';

const packageList = ({packages}) => (
  <div className='packagelist'>
    <ul>
      {packages.map(package => (
        <li key={package._id}>
          <a href={`/package/${package._id}`}>{package.name}</a>
        </li>
      ))}
    </ul>
  </div>
);

export default packageList;
