import styles from "./Page.module.scss";

export const SettingsPage = () => (
    <section className={styles.page}>
        <h1 className={styles.heading}>Settings</h1>
        <p className={styles.subheading}>
            Notification channels, tracked categories, and account preferences will be configured here.
        </p>
    </section>
);
