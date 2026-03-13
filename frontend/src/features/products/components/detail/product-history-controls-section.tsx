import { Col, Form, Row, Segmented } from "antd";
import { PRODUCT_HISTORY_RANGE_OPTIONS } from "../../constants/product-detail.constants";
import styles from "../product-detail-view.module.scss";
import type { ProductHistoryControlsSectionProps } from "../../types/product-detail-sections.types";

export const ProductHistoryControlsSection = ({ controls, onSetRange }: ProductHistoryControlsSectionProps) => (
    <Form className={styles.historyControlsForm} layout="vertical">
        <Row className={styles.historyControlRow} gutter={[12, 12]}>
            <Col span={24}>
                <Form.Item className={styles.formItem} label="Time range">
                    <Segmented
                        aria-label="Time range"
                        block
                        options={PRODUCT_HISTORY_RANGE_OPTIONS}
                        value={controls.range}
                        onChange={(value) => onSetRange(value as typeof controls.range)}
                    />
                </Form.Item>
            </Col>
        </Row>
    </Form>
);
