
export interface TocItem {
    text: string
    id: string
    level: number
}

export function extractToc(markdown: string): TocItem[] {
    const headingRegex = /^(#{2,3})\s+(.*)$/gm
    const toc: TocItem[] = []

    let match
    while((match = headingRegex.exec(markdown)) !== null) {
        const level = match[1].length;
        const text = match[2].trim()
        const id = text.toLocaleLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, '-')

        toc.push({text, id, level})
    }

    return toc;
}