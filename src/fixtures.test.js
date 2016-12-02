const helloWorld = {
  name: 'hello',
  git: 'structuresound/hello',
  target: 'bin',
  build: {
    with: 'ninja',
  },
  deps: [
    {
      git: {
        repository: 'google/googletest',
        archive: 'release-1.7.0'
      },
      build: {
        with: 'cmake'
      },
      path: {
        project: 'source'
      }
    }
  ]
};

export { helloWorld };
