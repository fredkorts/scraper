import { Col, Flex, Form, Row, Segmented, Select, Switch, Typography } from "antd";
import { AppButton } from "../../../../components/app-button/AppButton";
import { CategoryTreeSelect } from "../../../categories/components/category-tree-select";
import {
    PRODUCT_HISTORY_RANGE_OPTIONS,
    PRODUCT_HISTORY_STOCK_FILTER_OPTIONS,
} from "../../constants/product-detail.constants";
import styles from "../product-detail-view.module.scss";
import type { ProductHistoryControlsSectionProps } from "../../types/product-detail-sections.types";

export const ProductHistoryControlsSection = ({
    availableCategoryOptions,
    controls,
    hasOriginalPriceData,
    onResetFilters,
    onSetCategoryId,
    onSetRange,
    onSetShowOriginalPrice,
    onSetShowStockOverlay,
    onSetStockFilter,
}: ProductHistoryControlsSectionProps) => {
    const historyCategoryTreeData = availableCategoryOptions.map((category) => ({
        key: category.id,
        value: category.id,
        title: category.name,
    }));

    return (
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

            <Row className={styles.historyControlRow} gutter={[12, 12]}>
                <Col lg={12} md={12} sm={24} xs={24}>
                    <Form.Item className={styles.formItem} label="Category">
                        <CategoryTreeSelect
                            allowClear
                            ariaLabel="Category"
                            className={styles.fullWidthControl}
                            placeholder="All visible categories"
                            treeData={historyCategoryTreeData}
                            value={controls.categoryId}
                            onChange={(value) => onSetCategoryId(value)}
                        />
                    </Form.Item>
                </Col>

                <Col lg={12} md={12} sm={24} xs={24}>
                    <Form.Item className={styles.formItem} label="Stock filter">
                        <Select
                            aria-label="Stock filter"
                            className={styles.fullWidthControl}
                            options={PRODUCT_HISTORY_STOCK_FILTER_OPTIONS}
                            popupMatchSelectWidth={false}
                            value={controls.stockFilter}
                            onChange={(value) => onSetStockFilter(value)}
                        />
                    </Form.Item>
                </Col>
            </Row>

            <Row className={styles.historyControlRow} gutter={[12, 12]}>
                <Col lg={18} md={16} sm={24} xs={24}>
                    <Flex className={styles.switchControlGroup} gap="middle" wrap>
                        <Flex align="center" className={styles.switchControlItem} gap="small">
                            <Switch
                                aria-label="Show original price"
                                checked={controls.showOriginalPrice}
                                disabled={!hasOriginalPriceData}
                                onChange={onSetShowOriginalPrice}
                            />
                            <Typography.Text>Show original price</Typography.Text>
                        </Flex>

                        <Flex align="center" className={styles.switchControlItem} gap="small">
                            <Switch
                                aria-label="Show stock overlay"
                                checked={controls.showStockOverlay}
                                onChange={onSetShowStockOverlay}
                            />
                            <Typography.Text>Show stock overlay</Typography.Text>
                        </Flex>
                    </Flex>
                </Col>

                <Col lg={6} md={8} sm={24} xs={24}>
                    <Flex className={styles.resetControlAction} justify="end">
                        <AppButton onClick={onResetFilters}>Reset filters</AppButton>
                    </Flex>
                </Col>
            </Row>
        </Form>
    );
};
