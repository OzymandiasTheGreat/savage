export interface Change {
	type: "insert" | "update" | "delete" | "shuffle" | "reverse";
	path: string[];
	value?: any;
	oldValue?: any;
	object?: any;
}


export type ObserveFunction = (changes: Change[]) => void;


export type Observable<T> = Partial<T> & {
	observe: (callback: ObserveFunction, options?: {
		path?: string,
		pathsOf?: string,
		pathsFrom?: string,
	}) => void;
	unobserve: (func?: ObserveFunction) => void;
};
