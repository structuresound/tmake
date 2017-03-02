const headerExtentions = [
  'h', 'hh', 'hpp', 'hxx', 'ipp'
]

export const defaults = {
  flags: {
    compiler: {
      clang: {
        ios: {
          arch: 'arm64',
          isysroot: '{CROSS_TOP}/SDKs/{CROSS_SDK}',
          'miphoneos-version-min': '={SDK_VERSION}',
          simulator: {
            'mios-simulator-version-min': '=6.1',
            isysroot: '{CROSS_TOP}/SDKs/{CROSS_SDK}'
          }
        }
      }
    },
    cxx: {
      O: 2,
      mac: { std: 'c++11', stdlib: 'libc++' },
      linux: { std: 'c++0x', pthread: true },
    },
    linker: {
      linux: { 'lstdc++': true, lpthread: true },
      mac: { 'lc++': true }
    },
    frameworks: {
      mac: { CoreFoundation: true }
    }
  },
  assets: {
    images: {
      glob: ['**/*.png', '**/*.jpg', '**/*.jpeg', '**/*.tiff', '**/*.ico', '**/*.svg', '**/*.bmp']
    },
    fonts: {
      glob: ['**/*.ttf', '**/*.otf', '**/*.woff', '**/*.woff2']
    }
  },
  headers: {
    glob: [`**/*.{${headerExtentions.join(',')}}`]
  },
  sources: {
    glob: ['**/*.cpp', '**/*.cc', '**/*.c', '!test/**', '!tests/**', '!**/*.test.*']
  }
}