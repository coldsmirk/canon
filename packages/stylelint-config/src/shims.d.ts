// `stylelint-config-recess-order/groups` ships no type declarations.
declare module "stylelint-config-recess-order/groups" {
  const propertyGroups: Array<{ properties: string[] }>;
  export default propertyGroups;
}
