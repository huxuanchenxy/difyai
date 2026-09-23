export interface DemoScriptRule {
  keywords: string[]
  response: string
  nextState?: string
}

export interface DemoScriptState {
  name: string
  rules: DemoScriptRule[]
  defaultResponse: string
}

export interface DemoScript {
  initialState: string
  welcomeMessages?: Record<string, string>
  states: Record<string, DemoScriptState>
}

export const demoScript: DemoScript = {
  initialState: 'welcome',
  states: {
    welcome: {
      name: '欢迎',
      rules: [
        {
          keywords: ['项目经理', 'project manager', 'pm'],
          response: '您好！欢迎使用AI智能助手。作为项目经理，您可以上传设备文件、点位文件和图例文件来构建知识库。',
          nextState: 'project_manager',
        },
        {
          keywords: ['开发人员', 'developer', 'dev'],
          response: '您好！欢迎使用AI智能助手。作为开发人员，您可以上传图纸进行设备识别、点位绑定和界面生成。',
          nextState: 'developer',
        },
        {
          keywords: ['使用人员', 'user', '运维'],
          response: '您好！欢迎使用AI智能助手。作为使用人员，您可以查询运维信息，与组态画面交互。',
          nextState: 'user',
        },
        {
          keywords: ['登录', 'login'],
          response: '请选择您的角色：项目经理 / 开发人员 / 使用人员',
          nextState: 'welcome',
        },
      ],
      defaultResponse: '您好！欢迎使用AI智能助手。请告诉我您的角色：项目经理、开发人员或使用人员？',
    },
  },
}

export class DemoScriptEngine {
  private currentState: string;
  private script: DemoScript;

  constructor(customScript?: DemoScript) {
    this.script = customScript || demoScript
    this.currentState = this.script.initialState
  }

  setScript(script: DemoScript): void {
    this.script = script
    this.currentState = script.initialState
  }

  getCurrentStateName(): string {
    return this.script.states[this.currentState]?.name || '未知'
  }

  processInput(input: string): { response: string; stateChanged: boolean; } {
    const state = this.script.states[this.currentState]
    if (!state) {
      return { response: '未知状态', stateChanged: false }
    }

    // 关键词需与用户输入完全相等（去首尾空格、忽略大小写）才命中，
    // 避免短关键词（如"设备"）误命中包含它的长句
    const normalizedInput = input.trim().toLowerCase()

    for (const rule of state.rules) {
      const matched = rule.keywords.some(keyword =>
        normalizedInput === keyword.trim().toLowerCase(),
      )
      if (matched) {
        const previousState = this.currentState
        if (rule.nextState) {
          this.currentState = rule.nextState
        }
        return {
          response: rule.response,
          stateChanged: previousState !== this.currentState,
        }
      }
    }

    return { response: state.defaultResponse, stateChanged: false }
  }

  reset(): void {
    this.currentState = this.script.initialState
  }

  getResponse(input: string): string {
    const result = this.processInput(input)
    return result.response
  }

  getWelcomeMessage(role: string): string {
    const welcomeMessages = this.script.welcomeMessages
    if (welcomeMessages) {
      if (role === 'project_manager' && welcomeMessages.project_manager) {
        this.currentState = 'project_manager'
        return welcomeMessages.project_manager
      } else if (role === 'developer' && welcomeMessages.developer) {
        this.currentState = 'developer'
        return welcomeMessages.developer
      } else if (role === 'user' && welcomeMessages.user) {
        this.currentState = 'user'
        return welcomeMessages.user
      } else if (role === 'backend_ops' && (welcomeMessages as any).backend_ops) {
        this.currentState = 'backend_ops'
        return (welcomeMessages as any).backend_ops
      }
      return welcomeMessages.default || ''
    }

    if (role === 'project_manager') {
      this.currentState = 'project_manager'
      return '您好！欢迎使用AI智能助手。作为项目经理，您可以上传设备文件、点位文件和图例文件来构建知识库。'
    } else if (role === 'developer') {
      this.currentState = 'developer'
      return '您好！欢迎使用AI智能助手。作为开发人员，您可以上传图纸进行设备识别、点位绑定和界面生成。'
    } else if (role === 'user') {
      this.currentState = 'user'
      return '您好！欢迎使用AI智能助手。作为使用人员，您可以查询运维信息、与组态画面交互，或输入"图表"让AI为您生成数据可视化图表。'
    } else if (role === 'backend_ops') {
      this.currentState = 'backend_ops'
      return '您好！欢迎使用AI智能助手。作为后台运维人员，您可以配置 Agent 技能、管理运维任务。输入"技能"或"skill"开始选择需要的技能类型。'
    }
    return ''
  }
}
