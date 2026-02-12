declare module "frappe-gantt" {
  type ViewMode = {
    name: string;
    padding?: string | [string, string];
    step?: string;
    date_format?: string;
    column_width?: number;
    lower_text?: string | ((date: Date, previousDate?: Date, language?: string) => string);
    upper_text?: string | ((date: Date, previousDate?: Date, language?: string) => string);
    upper_text_frequency?: number;
    thick_line?: (date: Date) => boolean;
    snap_at?: string;
  };

  type HolidayDefinitionEntry =
    | string
    | Date
    | {
        date: string;
        name?: string;
      }
    | ((date: Date) => boolean);

  export type PopupContext = {
    task: GanttTask;
    chart: unknown;
    get_title: () => HTMLElement;
    get_subtitle: () => HTMLElement;
    get_details: () => HTMLElement;
    set_title: (html: string) => void;
    set_subtitle: (html: string) => void;
    set_details: (html: string) => void;
    add_action: (html: string, callback: () => void) => void;
  };

  export type GanttTask = {
    id: string;
    name: string;
    start: string;
    end: string;
    progress: number;
    custom_class?: string;
  };

  export default class Gantt {
    constructor(
      container: HTMLElement,
      tasks: GanttTask[],
      options?: {
        view_mode?: "Day" | "Week" | "Month" | string;
        on_click?: (task: GanttTask) => void;
        language?: string;
        date_format?: string;
        readonly?: boolean;
        readonly_dates?: boolean;
        readonly_progress?: boolean;
        container_height?: "auto" | number;
        infinite_padding?: boolean;
        auto_move_label?: boolean;
        scroll_to?: "today" | "start" | "end" | string;
        popup_on?: "click" | "hover";
        popup?: (context: PopupContext) => false | string | void;
        holidays?: Record<string, "weekend" | HolidayDefinitionEntry[]>;
        is_weekend?: (date: Date) => boolean;
        view_modes?: ViewMode[];
        today_button?: boolean;
        upper_header_height?: number;
        lower_header_height?: number;
        bar_height?: number;
        padding?: number;
      },
    );
    change_view_mode(mode: string | ViewMode, maintain_pos?: boolean): void;
    set_scroll_position(target: "today" | "start" | "end" | string): void;
    scroll_current(): void;
  }
}
