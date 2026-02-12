
const isValidFilename = (name) => /^[a-zA-Z0-9_\-.]+$/.test(name);

const title = "test_01";
const filename = `${title.replace(/[^a-z0-9가-힣]/gi, '_') || 'newsletter'}.html`;

console.log("Title:", title);
console.log("Filename:", filename);
console.log("IsValid:", isValidFilename(filename));

const title2 = "test 01";
const filename2 = `${title2.replace(/[^a-z0-9가-힣]/gi, '_') || 'newsletter'}.html`;
console.log("Title2:", title2);
console.log("Filename2:", filename2);
console.log("IsValid2:", isValidFilename(filename2));

const title3 = "한글test";
const filename3 = `${title3.replace(/[^a-z0-9가-힣]/gi, '_') || 'newsletter'}.html`;
console.log("Title3:", title3);
console.log("Filename3:", filename3);
console.log("IsValid3:", isValidFilename(filename3));
