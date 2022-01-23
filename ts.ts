export interface ITs {
	name: string;
}

export const ts = <T>(name: string) => {
	console.log(`${name}, this is the future of JavaScript`);
};
ts<ITs>('TypeScript');
