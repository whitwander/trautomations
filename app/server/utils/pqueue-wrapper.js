module.exports = async () => {
  const mod = await import('p-queue');
  return mod.default;
};
