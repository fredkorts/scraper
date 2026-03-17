import { Col, Form, Row, Segmented, Select, Space, Switch, Typography } from "antd";
import { AppButton } from "../../../../components/app-button/AppButton";
import {
    PRODUCT_HISTORY_RANGE_OPTIONS,
    PRODUCT_HISTORY_STOCK_FILTER_OPTIONS,
} from "../../constants/product-detail.constants";
import styles from "../product-detail-view.module.scss";
import type { ProductHistoryControlsSectionProps } from "../../types/product-detail-sections.types";

export const ProductHistoryControlsSection = ({
    controls,
    categoryOptions,
    onSetRange,
    onSetCategoryId,
    onSetStockFilter,
    onSetShowOriginalPrice,
    onSetShowStockOverlay,
    onResetFilters,
}: ProductHistoryControlsSectionProps) => (
    <Form className={styles.historyControlsForm} layout="vertical">
        <Row className={styles.historyControlRow} gutter={[12, 12]}>
            <Col lg={9} md={24} sm={24} xs={24}>
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
            <Col lg={7} md={12} sm={24} xs={24}>
                <Form.Item className={styles.formItem} label="Category">
                    <Select
                        aria-label="Category"
                        allowClear
                        className={styles.fullWidthControl}
                        optionFilterProp="label"
                        options={categoryOptions.map((option) => ({
                            value: option.id,
                            label: option.name,
                        }))}
                        placeholder="All categories"
                        value={controls.categoryId}
                        onChange={(value) => onSetCategoryId(typeof value === "string" ? value : undefined)}
                    />
                </Form.Item>
            </Col>
            <Col lg={8} md={12} sm={24} xs={24}>
                <Form.Item className={styles.formItem} label="Stock filter">
                    <Select
                        aria-label="Stock filter"
                        className={styles.fullWidthControl}
                        options={PRODUCT_HISTORY_STOCK_FILTER_OPTIONS.map((option) => ({
                            value: option.value,
                            label: option.label,
                        }))}
                        value={controls.stockFilter}
                        onChange={(value) => onSetStockFilter(value as typeof controls.stockFilter)}
                    />
                </Form.Item>
            </Col>
            <Col lg={12} md={24} sm={24} xs={24}>
                <Form.Item className={styles.formItem} label="Chart overlays">
                    <Space className={styles.switchControlGroup} size="large" wrap>
                        <Space className={styles.switchControlItem} size="small">
                            <Switch
                                aria-label="Show original price"
                                checked={controls.showOriginalPrice}
                                onChange={onSetShowOriginalPrice}
                            />
                            <Typography.Text>Original price line</Typography.Text>
                        </Space>
                        <Space className={styles.switchControlItem} size="small">
                            <Switch
                                aria-label="Show stock overlay"
                                checked={controls.showStockOverlay}
                                onChange={onSetShowStockOverlay}
                            />
                            <Typography.Text>Stock overlay</Typography.Text>
                        </Space>
                    </Space>
                </Form.Item>
            </Col>
            <Col lg={12} md={24} sm={24} xs={24}>
                <Form.Item className={styles.formItem} label=" ">
                    <div className={styles.resetControlAction}>
                        <AppButton intent="secondary" onClick={onResetFilters}>
                            Reset filters
                        </AppButton>
                    </div>
                </Form.Item>
            </Col>
        </Row>
    </Form>
);
