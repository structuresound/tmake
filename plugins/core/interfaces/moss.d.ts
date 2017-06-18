declare namespace Moss {
  class Parser {
    keywords?: string[]
    selectors?: string[]
  }

  class Layer {
    $parser?: Moss.Parser
    $environment?: string[]
    $options?: string[]
  }
}