export interface CourseResource {
    name: string;
    url: string;
    type?: string;
    size?: number;
    viewerUrl?: string;
}

export interface CourseDocument {
    id: string;
    materials?: CourseResource[];
    [key: string]: unknown; 
}