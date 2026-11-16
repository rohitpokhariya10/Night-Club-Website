import next from 'eslint-config-next/core-web-vitals';
const config=[...next,{ignores:['**/dist/**','**/generated/**','**/.next/**']},{settings:{next:{rootDir:'apps/web/'}},rules:{'@next/next/no-html-link-for-pages':['error','apps/web/src/app']}}];
export default config;
