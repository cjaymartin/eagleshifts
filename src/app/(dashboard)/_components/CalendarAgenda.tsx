import React, { useRef, useEffect } from 'react';
import addClass from 'dom-helpers/addClass';
import removeClass from 'dom-helpers/removeClass';
import getWidth from 'dom-helpers/width';
import scrollbarSize from 'dom-helpers/scrollbarSize';
import isEqual from 'lodash/isEqual';
import { Navigate, ViewStatic } from 'react-big-calendar';

// Extend ViewStatic to include our custom range method
interface AgendaViewStatic extends ViewStatic {
    range: (
        start: Date,
        options: { length?: number; localizer: Localizer }
    ) => { start: Date; end: Date };
}

// Type definitions
interface Event {
    id: string;
    title: string;
    start: Date;
    end: Date;
    allDay?: boolean;
    [key: string]: any;
}

interface Accessors {
    start: (event: Event) => Date;
    end: (event: Event) => Date;
    allDay: (event: Event) => boolean;
    title: (event: Event) => string;
}

interface Components {
    event?: React.ComponentType<{ event: Event; title: string }>;
    date?: React.ComponentType<{ day: Date; label: string | undefined }>;
    time?: React.ComponentType<{ event: Event; day: Date; label: string }>;
}

interface Getters {
    eventProp: (
        event: Event,
        start: Date,
        end: Date,
        isSelected: boolean
    ) => { className?: string; style?: React.CSSProperties };
}

interface Localizer {
    format: (date: Date | { start: Date; end: Date }, format: string) => string;
    messages: {
        allDay: string;
        date: string;
        time: string;
        event: string;
        noEventsInRange: string;
    };
    startOf: (date: Date, unit: string) => Date;
    endOf: (date: Date, unit: string) => Date;
    add: (date: Date, amount: number, unit: string) => Date;
    range: (start: Date, end: Date, unit: string) => Date[];
    eq: (date1: Date, date2: Date) => boolean;
    inEventRange: ({
        event,
        range,
    }: {
        event: { start: Date; end: Date };
        range: { start: Date; end: Date };
    }) => boolean;
    isSameDate: (date1: Date, date2: Date) => boolean;
    gt: (date1: Date, date2: Date, unit: string) => boolean;
    lt: (date1: Date, date2: Date, unit: string) => boolean;
}

interface AgendaProps {
    accessors: Accessors;
    components: Components;
    date: Date;
    events: Event[];
    getters: Getters;
    length?: number;
    localizer: Localizer;
    onDoubleClickEvent?: (event: Event, e: React.SyntheticEvent) => void;
    onSelectEvent?: (event: Event, e: React.SyntheticEvent) => void;
    selected?: Event;
}

function isSelected(
    event: Event | null | undefined,
    selected: Event | null | undefined
): boolean {
    if (!event || selected == null) return false;
    return isEqual(event, selected);
}

function inRange(
    e: Event,
    start: Date,
    end: Date,
    accessors: Accessors,
    localizer: Localizer
): boolean {
    const event = {
        start: accessors.start(e),
        end: accessors.end(e),
    };
    const range = { start, end };
    return localizer.inEventRange({ event, range });
}

const DEFAULT_LENGTH = 30;

function Agenda({
    accessors,
    components,
    date,
    events,
    getters,
    length = DEFAULT_LENGTH,
    localizer,
    onDoubleClickEvent,
    onSelectEvent,
    selected,
}: AgendaProps) {
    const headerRef = useRef<HTMLTableElement>(null);
    const dateColRef = useRef<HTMLTableCellElement>(null);
    const timeColRef = useRef<HTMLTableCellElement>(null);
    const contentRef = useRef<HTMLDivElement>(null);
    const tbodyRef = useRef<HTMLTableSectionElement>(null);

    useEffect(() => {
        _adjustHeader();
    });

    const renderDay = (day: Date, events: Event[], dayKey: number) => {
        const { event: Event, date: AgendaDate } = components;

        events = events.filter((e) =>
            inRange(
                e,
                localizer.startOf(day, 'day'),
                localizer.endOf(day, 'day'),
                accessors,
                localizer
            )
        );

        return events.map((event, idx) => {
            const title = accessors.title(event);
            const end = accessors.end(event);
            const start = accessors.start(event);

            const userProps = getters.eventProp(
                event,
                start,
                end,
                isSelected(event, selected)
            );

            const dateLabel: string | undefined =
                idx === 0
                    ? localizer.format(day, 'agendaDateFormat')
                    : undefined;
            const first =
                idx === 0 ? (
                    <td
                        rowSpan={events.length}
                        className="rbc-agenda-date-cell"
                    >
                        {AgendaDate ? (
                            <AgendaDate day={day} label={dateLabel} />
                        ) : (
                            dateLabel
                        )}
                    </td>
                ) : (
                    false
                );

            return (
                <tr
                    key={dayKey + '_' + idx}
                    className={userProps.className}
                    style={userProps.style}
                >
                    {first}
                    <td className="rbc-agenda-time-cell">
                        {timeRangeLabel(day, event)}
                    </td>
                    <td
                        className="rbc-agenda-event-cell"
                        onClick={(e) =>
                            onSelectEvent && onSelectEvent(event, e)
                        }
                        onDoubleClick={(e) =>
                            onDoubleClickEvent && onDoubleClickEvent(event, e)
                        }
                    >
                        {Event ? <Event event={event} title={title} /> : title}
                    </td>
                </tr>
            );
        });
    };

    const timeRangeLabel = (day: Date, event: Event) => {
        let labelClass = '';
        const TimeComponent = components.time;
        let label = localizer.messages.allDay;

        const end = accessors.end(event);
        const start = accessors.start(event);

        if (!accessors.allDay(event)) {
            if (localizer.eq(start, end)) {
                label = localizer.format(start, 'agendaTimeFormat');
            } else if (localizer.isSameDate(start, end)) {
                label = localizer.format(
                    { start, end },
                    'agendaTimeRangeFormat'
                );
            } else if (localizer.isSameDate(day, start)) {
                label = localizer.format(start, 'agendaTimeFormat');
            } else if (localizer.isSameDate(day, end)) {
                label = localizer.format(end, 'agendaTimeFormat');
            }
        }

        if (localizer.gt(day, start, 'day')) labelClass = 'rbc-continues-prior';
        if (localizer.lt(day, end, 'day')) labelClass += ' rbc-continues-after';

        return (
            <span className={labelClass.trim()}>
                {TimeComponent ? (
                    <TimeComponent event={event} day={day} label={label} />
                ) : (
                    label
                )}
            </span>
        );
    };

    const _adjustHeader = () => {
        if (!tbodyRef.current) return;

        const header = headerRef.current;
        const firstRow = tbodyRef.current
            .firstChild as HTMLTableRowElement | null;

        if (!firstRow) return;

        const isOverflowing =
            contentRef.current?.scrollHeight && contentRef.current?.clientHeight
                ? contentRef.current.scrollHeight >
                  contentRef.current.clientHeight
                : false;

        let _widths: number[] = [];
        const widths = _widths;

        _widths = [
            getWidth(firstRow.children[0] as HTMLElement),
            getWidth(firstRow.children[1] as HTMLElement),
        ];

        if (widths[0] !== _widths[0] || widths[1] !== _widths[1]) {
            if (dateColRef.current)
                dateColRef.current.style.width = _widths[0] + 'px';
            if (timeColRef.current)
                timeColRef.current.style.width = _widths[1] + 'px';
        }

        if (isOverflowing && header) {
            addClass(header, 'rbc-header-overflowing');
            header.style.marginRight = scrollbarSize() + 'px';
        } else if (header) {
            removeClass(header, 'rbc-header-overflowing');
        }
    };

    const { messages } = localizer;
    const end = localizer.add(date, length, 'day');

    const range = localizer.range(date, end, 'day');

    events = events.filter((event) =>
        inRange(
            event,
            localizer.startOf(date, 'day'),
            localizer.endOf(end, 'day'),
            accessors,
            localizer
        )
    );

    events.sort((a, b) => +accessors.start(a) - +accessors.start(b));

    return (
        <div className="rbc-agenda-view">
            {events.length !== 0 ? (
                <React.Fragment>
                    <table ref={headerRef} className="rbc-agenda-table">
                        <thead>
                            <tr>
                                <th className="rbc-header" ref={dateColRef}>
                                    {messages.date}
                                </th>
                                <th className="rbc-header" ref={timeColRef}>
                                    {messages.time}
                                </th>
                                <th className="rbc-header">{messages.event}</th>
                            </tr>
                        </thead>
                    </table>
                    <div className="rbc-agenda-content" ref={contentRef}>
                        <table className="rbc-agenda-table">
                            <tbody ref={tbodyRef}>
                                {range.map((day, idx) =>
                                    renderDay(day, events, idx)
                                )}
                            </tbody>
                        </table>
                    </div>
                </React.Fragment>
            ) : (
                <span className="rbc-agenda-empty">
                    {messages.noEventsInRange}
                </span>
            )}
        </div>
    );
}

// Add static properties to make Agenda implement AgendaViewStatic
const AgendaWithStatics = Agenda as unknown as React.FC<AgendaProps> &
    AgendaViewStatic;

// Helper function for range calculation (not part of ViewStatic)
AgendaWithStatics.range = (
    start: Date,
    {
        length = DEFAULT_LENGTH,
        localizer,
    }: { length?: number; localizer: Localizer }
) => {
    const end = localizer.add(start, length, 'day');
    return { start, end };
};

// Required by ViewStatic interface
AgendaWithStatics.navigate = (date: Date, action: string, props: any) => {
    const { length = DEFAULT_LENGTH, localizer } = props;

    switch (action) {
        case Navigate.PREVIOUS:
            return localizer.add(date, -length, 'day');

        case Navigate.NEXT:
            return localizer.add(date, length, 'day');

        default:
            return date;
    }
};

// Required by ViewStatic interface
AgendaWithStatics.title = (
    start: Date,
    { formats, culture }: { formats: any[]; culture?: string }
) => {
    // We need to access localizer from props in the actual implementation
    // This is a simplified version that will be replaced by the actual implementation
    // when the component is used
    return '';
};

export default AgendaWithStatics;
