declare namespace TMake {
  namespace Editor {
    interface Data {
      config?: string
      result?: string
      environment?: string
      options?: string
    }
    interface Events {
      updateConfig(value: string): void;
      updateEnvironment(value: string): void;
    }
    namespace Actions {
      interface Update {
        value: string
        type: string
      }
    }
  }
}