export interface Poet {
    基本信息: {
        本名: string;
        字: string;
        号: string;
        出生时间: string;
        去世时间: string;
        代表作品: string;
    };
}

export interface Message {
    role: 'user' | 'assistant';
    content: string;
    timestamp: string;
}

export interface ChatHistory {
    messages: Message[];
    poet_name: string;
}

export interface PoetInfo {
    name: string;
    type: string;
    dynasty: string;
    PersonId: number;
    birth_year?: number;
    death_year?: number;
    title?: string;
    works?: string;
    relation_to_poet: string;
    relations?: PoetInfo[];
    places?: PoetInfo[];
    basic_info?: {
        dynasty: string;
        birth_year: number;
        death_year: number;
        title: string;
        works: string;
    };
} 