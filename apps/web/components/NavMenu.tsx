import { DEFAULT_NAV_VARIANT, NAV_CONTAINER_CLASS, NAV_MENU_CTA, NAV_MENU_ITEMS, NAV_WRAPPER_CLASS, buildNavLinkClassWithExtra } from '@/constants/navMenu';

type NavMenuProps = {
  className?: string;
};

export default function NavMenu({ className }: NavMenuProps) {
  return (
    <nav
      role="navigation"
      className={[NAV_CONTAINER_CLASS, className].filter(Boolean).join(' ')}
    >
      <div className={NAV_WRAPPER_CLASS}>
        {NAV_MENU_ITEMS.map((item) => (
          <a key={item.href} href={item.href} className={buildNavLinkClassWithExtra(item, DEFAULT_NAV_VARIANT)}>
            {item.label}
          </a>
        ))}
        <a
          data-w-id={NAV_MENU_CTA.dataWId}
          href={NAV_MENU_CTA.href}
          className={NAV_MENU_CTA.className}
        >
          <div className="text-button in-navbar">{NAV_MENU_CTA.label}</div>
        </a>
      </div>
    </nav>
  );
}
